import { AtrocityError } from "../../foundation/errors/index.js";

export type RatchetErrorCode =
  | "RATCHET_INVALID_STATE"
  | "RATCHET_INVALID_KEY"
  | "RATCHET_DERIVATION_FAILED"
  | "RATCHET_NONCE_EXHAUSTED"
  | "RATCHET_MESSAGE_KEY_UNAVAILABLE";

export class RatchetError extends AtrocityError {
  constructor(
    code: RatchetErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "RatchetError";
  }
}
