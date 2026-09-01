import type { HandshakeMessage } from "../../protocol/handshake/handshake-types.js";
import type { AuthenticationCredentials } from "../../auth/credentials/credential-types.js";
import { WhatsAppAuthError, type WhatsAppAuthErrorCode } from "./whatsapp-auth-errors.js";
import type {
  WhatsAppAuthenticationDependencies,
  WhatsAppAuthenticationMode,
  WhatsAppAuthenticationStage,
} from "./whatsapp-auth-types.js";

/**
 * WhatsApp-specific authentication coordinator.
 *
 * This class owns lifecycle sequencing only. Crypto, state persistence,
 * protobuf codecs, payload builders, and raw transport are dependencies.
 */
export class WhatsAppAuthenticator {
  private stageValue: WhatsAppAuthenticationStage = "idle";

  constructor(
    private readonly dependencies: WhatsAppAuthenticationDependencies,
  ) {}

  get stage(): WhatsAppAuthenticationStage {
    return this.stageValue;
  }

  async authenticate(
    mode: WhatsAppAuthenticationMode,
    timeoutMs = 15_000,
  ): Promise<void> {
    this.transition("loading-state");

    const credentials =
      await this.dependencies.state.loadCredentials();

    if (!credentials) {
      this.fail(
        "WHATSAPP_AUTH_STATE_MISSING",
        "Authentication credentials are not available.",
      );
    }

    this.transition("noise-initializing");

    const noise = this.dependencies.createNoiseState(
      credentials,
    );

    try {
      const clientHello: HandshakeMessage = {
        type: "clientHello",
        clientHello: {
          ephemeral:
            noise.ephemeralPublicKey ??
            this.fail(
              "WHATSAPP_AUTH_HANDSHAKE_FAILED",
              "Noise state did not expose an ephemeral public key.",
            ),
        },
      };

      await this.sendHandshake(clientHello);
      this.transition("client-hello-sent");

      const rawServerHello =
        await this.dependencies.receiveRaw(timeoutMs);

      const serverHello =
        this.dependencies.decodeHandshake(rawServerHello);

      if (serverHello.type !== "serverHello") {
        this.fail(
          "WHATSAPP_AUTH_HANDSHAKE_FAILED",
          `Expected serverHello, received ${serverHello.type}.`,
        );
      }

      this.transition("server-hello-processed");

      const payload =
        mode === "login"
          ? await this.dependencies.buildLoginPayload(credentials)
          : await this.dependencies.buildRegistrationPayload(credentials);

      if (payload.byteLength === 0) {
        this.fail(
          "WHATSAPP_AUTH_PAYLOAD_FAILED",
          "Authentication payload is empty.",
        );
      }

      this.transition("payload-built");

      const encryptedPayload = noise.encryptAndHash(payload);

      const finish: HandshakeMessage = {
        type: "clientFinish",
        clientFinish: {
          static: new Uint8Array(0),
          payload: encryptedPayload,
        },
      };

      await this.sendHandshake(finish);
      this.transition("client-finish-sent");

      await this.dependencies.finishNoise(noise);
      await this.dependencies.persistAuthenticatedState(credentials);

      this.transition("authenticated");
    } catch (error) {
      this.stageValue = "failed";

      if (error instanceof WhatsAppAuthError) {
        throw error;
      }

      throw new WhatsAppAuthError(
        "WHATSAPP_AUTH_HANDSHAKE_FAILED",
        "WhatsApp authentication failed.",
        { cause: error },
      );
    }
  }

  private async sendHandshake(message: HandshakeMessage): Promise<void> {
    try {
      await this.dependencies.sendRaw(
        this.dependencies.encodeHandshake(message),
      );
    } catch (error) {
      throw new WhatsAppAuthError(
        "WHATSAPP_AUTH_TRANSPORT_FAILED",
        "Failed to send WhatsApp handshake message.",
        { cause: error },
      );
    }
  }

  private transition(next: WhatsAppAuthenticationStage): void {
    const allowed: Record<
      WhatsAppAuthenticationStage,
      readonly WhatsAppAuthenticationStage[]
    > = {
      idle: ["loading-state", "failed"],
      "loading-state": ["noise-initializing", "failed"],
      "noise-initializing": ["client-hello-sent", "failed"],
      "client-hello-sent": ["server-hello-processed", "failed"],
      "server-hello-processed": ["payload-built", "failed"],
      "payload-built": ["client-finish-sent", "failed"],
      "client-finish-sent": ["authenticated", "failed"],
      authenticated: [],
      failed: [],
    };

    if (!allowed[this.stageValue].includes(next)) {
      throw new WhatsAppAuthError(
        "WHATSAPP_AUTH_INVALID_STATE",
        `Invalid authentication transition ${this.stageValue} → ${next}.`,
      );
    }

    this.stageValue = next;
  }

  private fail(
    code: WhatsAppAuthErrorCode,
    message: string,
  ): never {
    this.stageValue = "failed";
    throw new WhatsAppAuthError(code, message);
  }
}
