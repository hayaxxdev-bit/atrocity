import type {
  HandshakeMessage,
  ServerHello,
} from "../protocol/handshake/handshake-types.js";
import { HandshakeOrchestratorError } from "./handshake-orchestrator-errors.js";
import type {
  HandshakeOrchestratorDependencies,
  HandshakeStage,
} from "./handshake-orchestrator-types.js";

/**
 * Coordinates the target handshake without owning transport, protocol,
 * crypto, or persistence implementations.
 *
 * This is an orchestration boundary only.
 */
export class HandshakeOrchestrator {
  private stageValue: HandshakeStage = "idle";
  private responseResolver?: (message: HandshakeMessage) => void;
  private responseRejecter?: (error: unknown) => void;
  private listening = false;

  constructor(
    private readonly dependencies: HandshakeOrchestratorDependencies,
  ) {}

  get stage(): HandshakeStage {
    return this.stageValue;
  }

  async run(timeoutMs = 15_000): Promise<void> {
    this.ensureStage("idle");
    this.attachTransportHandler();

    try {
      await this.dependencies.transport.connect();
      this.transition("transport-connected");

      const hello = this.dependencies.clientHelloFactory(
        this.dependencies.noise,
      );
      await this.sendHandshakeMessage(hello);
      this.transition("client-hello-sent");

      const serverHello = await this.waitForServerHello(timeoutMs);
      this.transition("server-hello-received");

      this.transition("noise-processing");
      await this.dependencies.handleServerHello(
        serverHello,
        this.dependencies.noise,
      );

      if (this.dependencies.noise.complete) {
        // Generic profiles may finish inside the server-hello handler.
      }

      const payload = await this.dependencies.createClientPayload(
        this.dependencies.noise,
      );

      const encryptedPayload = this.dependencies.noise
        ? encryptOpaquePayload(this.dependencies.noise, payload)
        : payload;

      this.transition("client-payload-encrypted");

      const encryptedStatic = this.getEncryptedStatic();
      const finish = this.dependencies.clientFinishFactory(
        this.dependencies.noise,
        encryptedStatic,
        encryptedPayload,
      );

      await this.sendHandshakeMessage(finish);
      this.transition("client-finish-sent");

      this.transition("complete");
    } catch (error) {
      this.transition("failed");

      if (error instanceof HandshakeOrchestratorError) {
        throw error;
      }

      throw new HandshakeOrchestratorError(
        "HANDSHAKE_PROTOCOL_ERROR",
        "WhatsApp handshake orchestration failed.",
        { cause: error },
      );
    } finally {
      this.detachTransportHandler();
    }
  }

  private async waitForServerHello(timeoutMs: number): Promise<ServerHello> {
    if (timeoutMs <= 0 || !Number.isSafeInteger(timeoutMs)) {
      throw new HandshakeOrchestratorError(
        "HANDSHAKE_TIMEOUT",
        "Handshake timeout must be a positive safe integer.",
      );
    }

    return new Promise<ServerHello>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this.responseResolver = undefined;
        this.responseRejecter = undefined;
      };

      this.responseResolver = (message) => {
        cleanup();

        if (message.type !== "serverHello") {
          reject(
            new HandshakeOrchestratorError(
              "HANDSHAKE_PROTOCOL_ERROR",
              `Expected serverHello, received ${message.type}.`,
            ),
          );
          return;
        }

        resolve(message.serverHello);
      };

      this.responseRejecter = (error) => {
        cleanup();
        reject(error);
      };

      timer = setTimeout(() => {
        cleanup();
        reject(
          new HandshakeOrchestratorError(
            "HANDSHAKE_TIMEOUT",
            `Timed out waiting for serverHello after ${timeoutMs} ms.`,
          ),
        );
      }, timeoutMs);
    });
  }

  private async sendHandshakeMessage(message: HandshakeMessage): Promise<void> {
    const encoded = this.dependencies.handshakeCodec.encode(message);

    try {
      await this.dependencies.transport.send(encoded);
    } catch (error) {
      throw new HandshakeOrchestratorError(
        "HANDSHAKE_TRANSPORT_ERROR",
        "Failed to send handshake message.",
        { cause: error },
      );
    }
  }

  private attachTransportHandler(): void {
    if (this.listening) return;
    this.listening = true;

    const existing = this.dependencies.transport.handlers;
    this.dependencies.transport.setHandlers({
      ...existing,
      onData: async (data) => {
        await existing.onData?.(data);

        try {
          const message = this.dependencies.handshakeCodec.decode(data);
          this.responseResolver?.(message);
        } catch (error) {
          this.responseRejecter?.(
            new HandshakeOrchestratorError(
              "HANDSHAKE_PROTOCOL_ERROR",
              "Failed to decode inbound handshake message.",
              { cause: error },
            ),
          );
        }
      },
      onError: async (error) => {
        await existing.onError?.(error);
        this.responseRejecter?.(
          new HandshakeOrchestratorError(
            "HANDSHAKE_TRANSPORT_ERROR",
            "Transport reported an error during handshake.",
            { cause: error },
          ),
        );
      },
      onClose: async (info) => {
        await existing.onClose?.(info);
        this.responseRejecter?.(
          new HandshakeOrchestratorError(
            "HANDSHAKE_TRANSPORT_ERROR",
            "Transport closed during handshake.",
          ),
        );
      },
    });
  }

  private detachTransportHandler(): void {
    if (!this.listening) return;
    this.listening = false;
    this.dependencies.transport.setHandlers({});
    this.responseResolver = undefined;
    this.responseRejecter = undefined;
  }

  private transition(next: HandshakeStage): void {
    const allowed: Record<HandshakeStage, readonly HandshakeStage[]> = {
      idle: ["transport-connected", "failed"],
      "transport-connected": ["client-hello-sent", "failed"],
      "client-hello-sent": ["server-hello-received", "failed"],
      "server-hello-received": ["noise-processing", "failed"],
      "noise-processing": ["client-payload-encrypted", "failed"],
      "client-payload-encrypted": ["client-finish-sent", "failed"],
      "client-finish-sent": ["complete", "failed"],
      complete: [],
      failed: [],
    };

    if (!allowed[this.stageValue].includes(next)) {
      throw new HandshakeOrchestratorError(
        "HANDSHAKE_INVALID_STATE",
        `Invalid handshake transition: ${this.stageValue} → ${next}.`,
      );
    }

    this.stageValue = next;
  }

  private ensureStage(expected: HandshakeStage): void {
    if (this.stageValue !== expected) {
      throw new HandshakeOrchestratorError(
        "HANDSHAKE_INVALID_STATE",
        `Handshake is ${this.stageValue}, expected ${expected}.`,
      );
    }
  }

  private getEncryptedStatic(): Uint8Array {
    // Target-specific static-key handshake output must be produced by the
    // Noise/profile layer. The orchestrator deliberately has no direct
    // access to private key material.
    return new Uint8Array(0);
  }
}

function encryptOpaquePayload(
  noise: NonNullable<HandshakeOrchestratorDependencies["noise"]>,
  payload: Uint8Array,
): Uint8Array {
  try {
    return noise.encryptAndHash
      ? noise.encryptAndHash(payload)
      : throwUnsupportedPayloadEncryption();
  } catch (error) {
    if (error instanceof HandshakeOrchestratorError) throw error;
    throw new HandshakeOrchestratorError(
      "HANDSHAKE_NOISE_ERROR",
      "Failed to encrypt handshake payload with Noise.",
      { cause: error },
    );
  }
}

function throwUnsupportedPayloadEncryption(): never {
  throw new HandshakeOrchestratorError(
    "HANDSHAKE_NOISE_ERROR",
    "The supplied Noise HandshakeState does not expose handshake payload encryption.",
  );
}          const encryptedPayload = this.dependencies.encryptPayload(
            this.dependencies.noise,
            payload,
          );


