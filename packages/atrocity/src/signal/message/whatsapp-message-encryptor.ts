import type { ProtocolNode } from "../../protocol/node/index.js";
import { WhatsAppMessageEncryptorError } from "./whatsapp-message-encryptor-errors.js";
import type { WhatsAppEncryptedMessage } from "./whatsapp-message-encryptor-types.js";

export type SignalMessageEncryptor = {
  readonly encryptMessage: (
    jid: string,
    data: Uint8Array,
  ) => Promise<{
    readonly type: "msg" | "pkmsg";
    readonly ciphertext: Uint8Array;
  }>;
};

export type WhatsAppMessageEnvelopeBuilder = {
  readonly build: (
    jid: string,
    encrypted: {
      readonly type: "msg" | "pkmsg";
      readonly ciphertext: Uint8Array;
    },
  ) => ProtocolNode;
};

export class WhatsAppMessageEncryptor {
  constructor(
    private readonly signal: SignalMessageEncryptor,
    private readonly envelope: WhatsAppMessageEnvelopeBuilder,
  ) {}

  async encrypt(
    jid: string,
    plaintext: Uint8Array,
  ): Promise<WhatsAppEncryptedMessage> {
    validateInput(jid, plaintext);

    try {
      const result = await this.signal.encryptMessage(jid, plaintext);
      return Object.freeze({
        jid,
        signalType: result.type,
        ciphertext: result.ciphertext.slice(),
      });
    } catch (error) {
      throw new WhatsAppMessageEncryptorError(
        "MESSAGE_ENCRYPT_FAILED",
        `Failed to encrypt message for ${jid}.`,
        { cause: error },
      );
    }
  }

  async buildEnvelope(
    jid: string,
    plaintext: Uint8Array,
  ): Promise<ProtocolNode> {
    const encrypted = await this.encrypt(jid, plaintext);
    return this.envelope.build(jid, {
      type: encrypted.signalType,
      ciphertext: encrypted.ciphertext,
    });
  }
}

function validateInput(
  jid: string,
  plaintext: Uint8Array,
): void {
  if (!jid || !jid.includes("@")) {
    throw new WhatsAppMessageEncryptorError(
      "MESSAGE_ENCRYPT_INVALID_JID",
      "Message recipient JID must be address-like.",
    );
  }

  if (!(plaintext instanceof Uint8Array) || plaintext.byteLength === 0) {
    throw new WhatsAppMessageEncryptorError(
      "MESSAGE_ENCRYPT_EMPTY_PAYLOAD",
      "Signal plaintext payload must be non-empty bytes.",
    );
  }
}
