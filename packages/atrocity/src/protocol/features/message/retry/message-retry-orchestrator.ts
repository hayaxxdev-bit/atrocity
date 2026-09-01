import type { ProtocolNode } from "../../../node/index.js";
import type { SignalMessageEncryptor } from "../../../../signal/message/index.js";
import { WhatsAppMessageEnvelopeBuilder } from "../../../../signal/message/index.js";
import { MessageRetryError } from "./message-retry-errors.js";
import type {
  MessageRetryRequest,
  MessageRetryResult,
  MessageRetryState,
} from "./message-retry-types.js";

export type MessageRetryDependencies = {
  readonly signal: SignalMessageEncryptor;
  readonly session: {
    readonly isHealthy: (jid: string) => Promise<boolean>;
    readonly rebuild: (jid: string) => Promise<void>;
  };
  readonly buildOuterMessage: (
    input: MessageRetryRequest,
    encrypted: readonly ProtocolNode[],
  ) => ProtocolNode;
  readonly sendNode: (node: ProtocolNode) => Promise<void>;
};

export class MessageRetryOrchestrator {
  private stateValue: MessageRetryState = "created";

  constructor(private readonly dependencies: MessageRetryDependencies) {}

  get state(): MessageRetryState {
    return this.stateValue;
  }

  async retry(request: MessageRetryRequest): Promise<MessageRetryResult> {
    this.require("created");
    validateRequest(request);
    this.stateValue = "inspecting";

    try {
      let sessionRebuilt = false;
      const healthy = await this.dependencies.session.isHealthy(request.remoteJid);

      if (
        !healthy ||
        request.reason === "session-missing" ||
        request.reason === "decryption-failure"
      ) {
        this.stateValue = "session-repairing";
        try {
          await this.dependencies.session.rebuild(request.remoteJid);
        } catch (error) {
          throw new MessageRetryError(
            "MESSAGE_RETRY_SESSION_REPAIR_FAILED",
            `Failed to rebuild Signal session for ${request.remoteJid}.`,
            { cause: error },
          );
        }
        sessionRebuilt = true;
      }

      this.stateValue = "re-encrypting";
      let encrypted: Awaited<ReturnType<SignalMessageEncryptor["encryptMessage"]>>;
      try {
        encrypted = await this.dependencies.signal.encryptMessage(
          request.remoteJid,
          request.plaintext,
        );
      } catch (error) {
        throw new MessageRetryError(
          "MESSAGE_RETRY_ENCRYPT_FAILED",
          `Failed to re-encrypt message ${request.messageId}.`,
          { cause: error },
        );
      }

      const envelope = new WhatsAppMessageEnvelopeBuilder().build(
        request.remoteJid,
        {
          type: encrypted.type,
          ciphertext: encrypted.ciphertext,
        },
      );

      this.stateValue = "resending";
      const outer = this.dependencies.buildOuterMessage(request, [envelope]);

      try {
        await this.dependencies.sendNode(outer);
      } catch (error) {
        throw new MessageRetryError(
          "MESSAGE_RETRY_SEND_FAILED",
          `Failed to resend message ${request.messageId}.`,
          { cause: error },
        );
      }

      this.stateValue = "completed";
      return Object.freeze({
        state: "completed",
        messageId: request.messageId,
        reEncrypted: true,
        sessionRebuilt,
      });
    } catch (error) {
      this.stateValue = "failed";
      if (error instanceof MessageRetryError) throw error;
      throw new MessageRetryError(
        "MESSAGE_RETRY_FAILED",
        `Message retry failed for ${request.messageId}.`,
        { cause: error },
      );
    }
  }

  private require(expected: MessageRetryState): void {
    if (this.stateValue !== expected) {
      throw new MessageRetryError(
        "MESSAGE_RETRY_INVALID_STATE",
        `Expected retry state ${expected}, current state is ${this.stateValue}.`,
      );
    }
  }
}

function validateRequest(request: MessageRetryRequest): void {
  if (!request.messageId) {
    throw new MessageRetryError("MESSAGE_RETRY_INVALID_INPUT", "Retry messageId is required.");
  }
  if (!request.remoteJid || !request.remoteJid.includes("@")) {
    throw new MessageRetryError("MESSAGE_RETRY_INVALID_INPUT", "Retry remoteJid is invalid.");
  }
  if (!(request.plaintext instanceof Uint8Array) || request.plaintext.byteLength === 0) {
    throw new MessageRetryError("MESSAGE_RETRY_INVALID_INPUT", "Retry plaintext must be non-empty bytes.");
  }
}
