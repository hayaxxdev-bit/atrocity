import { AtrocityError } from "../../../foundation/errors/index.js";

export type CompatibilityErrorCode =
  | "COMPAT_VECTOR_INVALID"
  | "COMPAT_VECTOR_DUPLICATE"
  | "COMPAT_VECTOR_DECODE"
  | "COMPAT_VECTOR_EXECUTION";

export class CompatibilityError extends AtrocityError {
  constructor(
    code: CompatibilityErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "CompatibilityError";
  }
}
