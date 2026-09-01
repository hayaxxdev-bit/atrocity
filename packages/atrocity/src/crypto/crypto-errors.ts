import { AtrocityError } from "../foundation/errors/index.js";

export type CryptoErrorCode =
  | "CRYPTO_INVALID_INPUT"
  | "CRYPTO_OPERATION_FAILED"
  | "CRYPTO_AUTH_FAILED"
  | "CRYPTO_INVALID_KEY";

export class CryptoError extends AtrocityError {
  constructor(
    code: CryptoErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "CryptoError";
  }
}
