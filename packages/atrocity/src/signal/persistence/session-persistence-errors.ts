import { AtrocityError } from "../../foundation/errors/index.js";

export type SessionPersistenceErrorCode =
  | "SESSION_PERSISTENCE_INVALID"
  | "SESSION_PERSISTENCE_CORRUPT"
  | "SESSION_PERSISTENCE_UNSUPPORTED_VERSION"
  | "SESSION_PERSISTENCE_IO"
  | "SESSION_PERSISTENCE_INTEGRITY"
  | "SESSION_PERSISTENCE_TOO_LARGE";

export class SessionPersistenceError extends AtrocityError {
  constructor(
    code: SessionPersistenceErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "SessionPersistenceError";
  }
}
