import { AtrocityError } from "../../foundation/errors/index.js";

export type X3DHErrorCode =
  | "X3DH_INVALID_BUNDLE"
  | "X3DH_INVALID_KEY"
  | "X3DH_SIGNATURE_INVALID"
  | "X3DH_DERIVATION_FAILED"
  | "X3DH_ASSOCIATED_DATA_INVALID";

export class X3DHError extends AtrocityError {
  constructor(
    code: X3DHErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "X3DHError";
  }
}
