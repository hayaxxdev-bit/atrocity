import { AtrocityError } from "../../foundation/errors/index.js";

export type SessionBootstrapErrorCode =
  | "SESSION_BOOTSTRAP_INVALID_STATE"
  | "SESSION_BOOTSTRAP_CREDENTIALS_MISSING"
  | "SESSION_BOOTSTRAP_CORRUPT"
  | "SESSION_BOOTSTRAP_INCOMPATIBLE"
  | "SESSION_BOOTSTRAP_FAILED"
  | "SESSION_BOOTSTRAP_NOT_FOUND";

export class SessionBootstrapError extends AtrocityError {
  constructor(
    code: SessionBootstrapErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "SessionBootstrapError";
  }
}
