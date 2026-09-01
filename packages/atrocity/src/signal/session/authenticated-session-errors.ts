import { AtrocityError } from "../../../foundation/errors/index.js";

export type AuthenticatedSessionErrorCode =
  | "AUTH_SESSION_INVALID_STATE"
  | "AUTH_SESSION_INVALID_INPUT"
  | "AUTH_SESSION_PERSIST_FAILED"
  | "AUTH_SESSION_FAILED";

export class AuthenticatedSessionError extends AtrocityError {
  constructor(
    code: AuthenticatedSessionErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "AuthenticatedSessionError";
  }
}
