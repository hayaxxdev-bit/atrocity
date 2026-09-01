import type { NoiseHandshakeState } from "../noise/handshake-state.js";
import type { Transport } from "../transport/transport.js";
import type {
  ClientFinish,
  ClientHello,
  HandshakeMessage,
  ServerHello,
} from "../protocol/handshake/handshake-types.js";

export type HandshakeStage =
  | "idle"
  | "transport-connected"
  | "client-hello-sent"
  | "server-hello-received"
  | "noise-processing"
  | "client-payload-encrypted"
  | "client-finish-sent"
  | "complete"
  | "failed";

export type ClientHelloFactory = (
  state: NoiseHandshakeState,
) => HandshakeMessage;

export type ServerHelloHandler = (
  message: ServerHello,
  state: NoiseHandshakeState,
) => Promise<void> | void;

export type ClientPayloadFactory = (
  state: NoiseHandshakeState,
) => Promise<Uint8Array> | Uint8Array;

export type ClientFinishFactory = (
  state: NoiseHandshakeState,
  encryptedStatic: Uint8Array,
  encryptedPayload: Uint8Array,
) => HandshakeMessage;

export type HandshakeOrchestratorDependencies = {
  readonly transport: Transport;
  readonly noise: NoiseHandshakeState;
  readonly clientHelloFactory: ClientHelloFactory;
  readonly handleServerHello: ServerHelloHandler;
  readonly createClientPayload: ClientPayloadFactory;
  readonly clientFinishFactory: ClientFinishFactory;
  readonly handshakeCodec: {
    encode(message: HandshakeMessage): Uint8Array;
    decode(input: Uint8Array): HandshakeMessage;
  };
};
