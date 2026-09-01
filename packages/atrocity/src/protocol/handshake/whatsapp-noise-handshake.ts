import { NoiseError } from "../../noise/noise-errors.js";
import type { HandshakeMessage } from "./handshake-types.js";
import {
  buildWhatsAppClientHello,
} from "./whatsapp-client-hello.js";
import {
  buildWhatsAppClientFinish,
} from "./whatsapp-client-finish.js";

export type WhatsAppNoiseHandshakeStage =
  | "created"
  | "client-hello-ready"
  | "server-hello-processed"
  | "client-finish-ready"
  | "transport-ready"
  | "failed";

export type WhatsAppNoiseHandshakeDependencies = {
  readonly ephemeralPublicKey: Uint8Array;

  readonly encodeHandshake: (
    message: HandshakeMessage,
  ) => Uint8Array;

  readonly processServerHello: (
    message: HandshakeMessage,
  ) => {
    readonly encryptedStatic: Uint8Array;
  };

  readonly buildClientPayload: () => Uint8Array;

  readonly encryptPayload: (
    payload: Uint8Array,
  ) => Uint8Array;

  readonly finishTransport: () => void;
};

export type WhatsAppNoiseHandshakeSnapshot = {
  readonly stage: WhatsAppNoiseHandshakeStage;
  readonly sent: readonly {
    readonly type: "clientHello" | "clientFinish";
    readonly bytes: Uint8Array;
  }[];
};

export class WhatsAppNoiseHandshake {
  private stageValue: WhatsAppNoiseHandshakeStage = "created";
  private readonly sentMessages: {
    readonly type: "clientHello" | "clientFinish";
    readonly bytes: Uint8Array;
  }[] = [];
  private encryptedStatic?: Uint8Array;

  constructor(
    private readonly dependencies: WhatsAppNoiseHandshakeDependencies,
  ) {
    if (
      !(dependencies.ephemeralPublicKey instanceof Uint8Array) ||
      dependencies.ephemeralPublicKey.byteLength !== 32
    ) {
      throw new NoiseError(
        "NOISE_INVALID_INPUT",
        "WhatsApp Noise handshake requires a 32-byte ephemeral public key.",
      );
    }
  }

  get stage(): WhatsAppNoiseHandshakeStage {
    return this.stageValue;
  }

  get snapshot(): WhatsAppNoiseHandshakeSnapshot {
    return Object.freeze({
      stage: this.stageValue,
      sent: Object.freeze(
        this.sentMessages.map((entry) =>
          Object.freeze({
            type: entry.type,
            bytes: entry.bytes.slice(),
          }),
        ),
      ),
    });
  }

  createClientHello(): Uint8Array {
    this.requireStage("created");

    try {
      const message = buildWhatsAppClientHello({
        ephemeralPublicKey:
          this.dependencies.ephemeralPublicKey,
      });

      const bytes = this.dependencies.encodeHandshake(message);
      this.sentMessages.push(Object.freeze({
        type: "clientHello",
        bytes: bytes.slice(),
      }));

      this.stageValue = "client-hello-ready";
      return bytes.slice();
    } catch (error) {
      this.fail(error);
    }
  }

  processServerHello(
    message: HandshakeMessage,
  ): void {
    this.requireStage("client-hello-ready");

    if (message.type !== "serverHello") {
      this.fail(
        new NoiseError(
          "NOISE_INVALID_INPUT",
          `Expected serverHello, received ${message.type}.`,
        ),
      );
    }

    try {
      const result = this.dependencies.processServerHello(message);
      this.encryptedStatic = result.encryptedStatic.slice();
      this.stageValue = "server-hello-processed";
    } catch (error) {
      this.fail(error);
    }
  }

  createClientFinish(): Uint8Array {
    this.requireStage("server-hello-processed");

    try {
      if (!this.encryptedStatic) {
        throw new NoiseError(
          "NOISE_HANDSHAKE_INCOMPLETE",
          "ServerHello processing did not produce encrypted static key.",
        );
      }

      const payload =
        this.dependencies.buildClientPayload();

      const encryptedPayload =
        this.dependencies.encryptPayload(payload);

      const message = buildWhatsAppClientFinish({
        encryptedStatic:
          encryptedStatic.encryptedStatic,
        encryptedPayload,
      });

      const bytes = this.dependencies.encodeHandshake(message);

      this.sentMessages.push(Object.freeze({
        type: "clientFinish",
        bytes: bytes.slice(),
      }));

      this.stageValue = "client-finish-ready";
      return bytes.slice();
    } catch (error) {
      this.fail(error);
    }
  }

  finish(): void {
    this.requireStage("client-finish-ready");

    try {
      this.dependencies.finishTransport();
      this.stageValue = "transport-ready";
    } catch (error) {
      this.fail(error);
    }
  }

  private requireStage(
    expected: WhatsAppNoiseHandshakeStage,
  ): void {
    if (this.stageValue !== expected) {
      throw new NoiseError(
        "NOISE_INVALID_STATE",
        `Expected handshake stage ${expected}, current stage is ${this.stageValue}.`,
      );
    }
  }

  private fail(error: unknown): never {
    this.stageValue = "failed";

    if (error instanceof NoiseError) throw error;

    throw new NoiseError(
      "NOISE_HANDSHAKE_FAILED",
      "WhatsApp Noise handshake failed.",
      { cause: error },
    );
  }
}
