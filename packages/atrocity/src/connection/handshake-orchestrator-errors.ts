import { AtrocityError } from "../foundation/errors/index.js";

export type HandshakeOrchestratorErrorCode =
  | "HANDSHAKE_INVALID_STATE"
  | "HANDSHAKE_TIMEOUT"
  | "HANDSHAKE_PROTOCOL_ERROR"
  | "HANDSHAKE_TRANSPORT_ERROR"
  | "HANDSHAKE_NOISE_ERROR";

export class HandshakeOrchestratorError extends AtrocityError {
  constructor(
    code: HandshakeOrchestratorErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "HandshakeOrchestratorError";
  }
}
