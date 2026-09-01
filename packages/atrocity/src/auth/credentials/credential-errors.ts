import { AtrocityError } from "../../foundation/errors/index.js";

export type CredentialErrorCode =
  | "CREDENTIAL_INVALID"
  | "CREDENTIAL_GENERATION_FAILED"
  | "CREDENTIAL_SERIALIZATION_FAILED"
  | "CREDENTIAL_KEY_MATERIAL_INVALID";

export class CredentialError extends AtrocityError {
  constructor(
    code: CredentialErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "CredentialError";
  }
}
