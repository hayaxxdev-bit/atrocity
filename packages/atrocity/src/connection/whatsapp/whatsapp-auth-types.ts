import type { HandshakeMessage } from "../../protocol/handshake/handshake-types.js";
import type { NoiseHandshakeState } from "../../noise/handshake-state.js";
import type { AuthenticationCredentials } from "../../auth/credentials/credential-types.js";
import type { AtrocityStateStore } from "../../auth/store/atrc-store.js";

export type WhatsAppAuthenticationStage =
  | "idle"
  | "loading-state"
  | "noise-initializing"
  | "client-hello-sent"
  | "server-hello-processed"
  | "payload-built"
  | "client-finish-sent"
  | "authenticated"
  | "failed";

export type WhatsAppAuthenticationMode = "login" | "registration";

export type WhatsAppAuthenticationContext = {
  readonly mode: WhatsAppAuthenticationMode;
  readonly stage: WhatsAppAuthenticationStage;
  readonly noise: NoiseHandshakeState;
  readonly credentials: AuthenticationCredentials;
};

export type WhatsAppAuthenticationDependencies = {
  readonly state: AtrocityStateStore;
  readonly createNoiseState: (
    credentials: AuthenticationCredentials,
  ) => NoiseHandshakeState;
  readonly encodeHandshake: (
    message: HandshakeMessage,
  ) => Uint8Array;
  readonly decodeHandshake: (
    input: Uint8Array,
  ) => HandshakeMessage;
  readonly sendRaw: (data: Uint8Array) => Promise<void>;
  readonly receiveRaw: (timeoutMs: number) => Promise<Uint8Array>;
  readonly buildLoginPayload: (
    credentials: AuthenticationCredentials,
  ) => Promise<Uint8Array>;
  readonly buildRegistrationPayload: (
    credentials: AuthenticationCredentials,
  ) => Promise<Uint8Array>;
  readonly finishNoise: (
    noise: NoiseHandshakeState,
  ) => Promise<void> | void;
  readonly persistAuthenticatedState: (
    credentials: AuthenticationCredentials,
  ) => Promise<void>;
};
