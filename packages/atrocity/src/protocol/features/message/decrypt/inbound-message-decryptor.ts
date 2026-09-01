import type { ProtocolNode } from "../../../node/index.js";
import {
  InboundMessageDecryptError,
} from "./inbound-message-decrypt-errors.js";
import type {
  InboundEncryptedMessage,
  InboundSignalMessageType,
  InboundDecryptionResult,
} from "./inbound-message-decrypt-types.js";

export type SignalInboundDecryptor = {
  readonly decryptMessage: (
    jid: string,
    type: InboundSignalMessageType,
    ciphertext: Uint8Array,
  ) => Promise<Uint8Array>;
};

export type InboundSessionCoordinator = {
  readonly ensureSession: (
    jid: string,
    type: InboundSignalMessageType,
    ciphertext: Uint8Array,
  ) => Promise<void>;
  readonly commit: (
    jid: string,
  ) => Promise<void>;
};

export class InboundMessageDecryptor {
  constructor(
    private readonly signal: SignalInboundDecryptor,
    private readonly session: InboundSessionCoordinator,
  ) {}

  extract(
    node: ProtocolNode,
  ): InboundEncryptedMessage {
    if (node.tag !== "to") {
      throw new InboundMessageDecryptError(
        "INBOUND_DECRYPT_INVALID_NODE",
        `Expected <to>, received <${node.tag}>.`,
      );
    }

    const jid = node.attrs.jid;
    if (!jid) {
      throw new InboundMessageDecryptError(
        "INBOUND_DECRYPT_INVALID_NODE",
        "Inbound encrypted message requires jid.",
      );
    }

    const enc =
      node.content?.kind === "nodes"
        ? node.content.value.find((child) => child.tag === "enc")
        : undefined;

    if (!enc) {
      throw new InboundMessageDecryptError(
        "INBOUND_DECRYPT_MISSING_ENCRYPTION",
        "Inbound <to> node does not contain <enc>.",
      );
    }

    const type = enc.attrs.type;
    if (type !== "msg" && type !== "pkmsg") {
      throw new InboundMessageDecryptError(
        "INBOUND_DECRYPT_INVALID_CIPHERTEXT",
        `Unsupported Signal message type ${String(type)}.`,
      );
    }

    if (enc.content?.kind !== "binary" || enc.content.value.byteLength === 0) {
      throw new InboundMessageDecryptError(
        "INBOUND_DECRYPT_INVALID_CIPHERTEXT",
        "Inbound <enc> must contain non-empty binary ciphertext.",
      );
    }

    return Object.freeze({
      remoteJid: jid,
      type,
      ciphertext: enc.content.value.slice(),
      messageNode: node,
    });
  }

  async decrypt(
    node: ProtocolNode,
  ): Promise<InboundDecryptionResult> {
    const encrypted = this.extract(node);

    try {
      if (encrypted.type === "pkmsg") {
        await this.session.ensureSession(
          encrypted.remoteJid,
          encrypted.type,
          encrypted.ciphertext,
        );
      }

      const plaintext =
        await this.signal.decryptMessage(
          encrypted.remoteJid,
          encrypted.type,
          encrypted.ciphertext,
        );

      // Ratchet/session persistence is committed before the caller publishes
      // the decoded application message.
      await this.session.commit(
        encrypted.remoteJid,
      );

      return Object.freeze({
        status: "decrypted",
        remoteJid: encrypted.remoteJid,
        plaintext: plaintext.slice(),
        type: encrypted.type,
      });
    } catch (error) {
      if (error instanceof InboundMessageDecryptError) {
        throw error;
      }

      throw new InboundMessageDecryptError(
        "INBOUND_DECRYPT_SESSION_FAILED",
        `Failed to decrypt inbound ${encrypted.type} for ${encrypted.remoteJid}.`,
        { cause: error },
      );
    }
  }
}
