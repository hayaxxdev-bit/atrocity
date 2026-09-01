import type { ProtocolNode } from "../../protocol/node/index.js";
import type { WABinaryCodec } from "../../protocol/codec/index.js";
import type { Transport } from "../transport.js";
import { safeTransportSend } from "../transport.js";
import { WhatsAppNoiseTransport } from "../whatsapp/index.js";

export type WhatsAppProtocolTransportState =
  | "idle"
  | "connecting"
  | "open"
  | "noise-ready"
  | "encrypted"
  | "closed"
  | "failed";

export type WhatsAppProtocolTransportConfig = {
  readonly wabinary: WABinaryCodec;
  readonly raw: Transport;
  readonly noise: WhatsAppNoiseTransport;
  readonly maxNodeBytes?: number;
};

export class WhatsAppProtocolTransport {
  private stateValue: WhatsAppProtocolTransportState = "idle";
  private nodeHandlers: {
    onNode?: (node: ProtocolNode) => void | Promise<void>;
    onError?: (error: unknown) => void | Promise<void>;
    onClose?: () => void | Promise<void>;
  } = {};
  private readonly maxNodeBytes: number;

  constructor(
    private readonly config: WhatsAppProtocolTransportConfig,
  ) {
    this.maxNodeBytes = config.maxNodeBytes ?? 16 * 1024 * 1024;
  }

  get state(): WhatsAppProtocolTransportState {
    return this.stateValue;
  }

  setNodeHandlers(handlers: typeof this.nodeHandlers): void {
    this.nodeHandlers = Object.freeze({ ...handlers });
  }

  async connect(): Promise<void> {
    if (this.stateValue !== "idle" && this.stateValue !== "closed") {
      throw new Error(`Cannot connect from state ${this.stateValue}.`);
    }

    this.transition("connecting");

    this.config.raw.setHandlers({
      onData: async (data) => {
        try {
          await this.handleRawData(data);
        } catch (error) {
          this.transition("failed");
          await this.nodeHandlers.onError?.(error);
        }
      },
      onError: async (error) => {
        this.transition("failed");
        await this.nodeHandlers.onError?.(error);
      },
      onClose: async () => {
        this.transition("closed");
        await this.nodeHandlers.onClose?.();
      },
    });

    await this.config.raw.connect();
    this.transition("open");
  }

  /**
   * Installs an already-established Noise transport cipher.
   * Handshake orchestration owns when this becomes valid.
   */
  installEncryptedTransport(): void {
    if (this.stateValue !== "open") {
      throw new Error(
        `Cannot install Noise transport from state ${this.stateValue}.`,
      );
    }

    this.transition("noise-ready");
    this.transition("encrypted");
  }

  async sendNode(
    node: ProtocolNode,
    associatedData: Uint8Array = new Uint8Array(0),
  ): Promise<void> {
    if (this.stateValue !== "encrypted") {
      throw new Error(
        `Cannot send node from state ${this.stateValue}.`,
      );
    }

    const encodedNode = this.config.wabinary.encode(node);

    if (encodedNode.byteLength > this.maxNodeBytes) {
      throw new Error(
        "Encoded protocol node exceeds configured maximum.",
      );
    }

    const frame = this.config.noise.encode(
      encodedNode,
      associatedData,
    );

    await safeTransportSend(this.config.raw, frame);
  }

  async close(): Promise<void> {
    if (this.stateValue === "closed" || this.stateValue === "idle") {
      return;
    }

    await this.config.raw.close({
      reason: "requested",
    });
  }

  private async handleRawData(
    data: Uint8Array,
  ): Promise<void> {
    if (this.stateValue !== "encrypted") {
      // Handshake traffic belongs to the authentication/handshake layer.
      return;
    }

    const decoded = this.config.noise.decode(
      data,
    );

    if (decoded.plaintext.byteLength > this.maxNodeBytes) {
      throw new Error(
        "Decrypted protocol node exceeds configured maximum.",
      );
    }

    const node = this.config.wabinary.decode(
      decoded.plaintext,
    );

    await this.nodeHandlers.onNode?.(node);
  }

  private transition(
    next: WhatsAppProtocolTransportState,
  ): void {
    const allowed: Record<
      WhatsAppProtocolTransportState,
      readonly WhatsAppProtocolTransportState[]
    > = {
      idle: ["connecting"],
      connecting: ["open", "failed", "closed"],
      open: ["noise-ready", "closed", "failed"],
      "noise-ready": ["encrypted", "closed", "failed"],
      encrypted: ["closed", "failed"],
      closed: ["connecting"],
      failed: ["closed", "connecting"],
    };

    if (!allowed[this.stateValue].includes(next)) {
      throw new Error(
        `Invalid protocol transport transition ${this.stateValue} → ${next}.`,
      );
    }

    this.stateValue = next;
  }
}
