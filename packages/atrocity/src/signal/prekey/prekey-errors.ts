import { AtrocityError } from "../../foundation/errors/index.js";

export type PreKeyErrorCode =
  | "PREKEY_INVALID"
  | "PREKEY_NOT_FOUND"
  | "PREKEY_EXHAUSTED"
  | "PREKEY_SIGNATURE_INVALID";

export class PreKeyError extends AtrocityError {
  constructor(
    code: PreKeyErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "PreKeyError";
  }
}
