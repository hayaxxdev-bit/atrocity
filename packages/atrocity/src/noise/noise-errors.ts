import { AtrocityError } from "../foundation/errors/index.js";

export type NoiseErrorCode =
  | "NOISE_INVALID_STATE"
  | "NOISE_INVALID_INPUT"
  | "NOISE_HANDSHAKE_FAILED"
  | "NOISE_DH_FAILED"
  | "NOISE_CIPHER_FAILED"
  | "NOISE_HANDSHAKE_INCOMPLETE"
  | "NOISE_ALREADY_COMPLETE";

export class NoiseError extends AtrocityError {
  constructor(
    code: NoiseErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "NoiseError";
  }
}
