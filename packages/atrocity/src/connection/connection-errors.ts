import { AtrocityError } from "../foundation/errors/index.js";

export type ConnectionErrorCode =
  | "CONNECTION_INVALID_STATE"
  | "CONNECTION_CONNECT_FAILED"
  | "CONNECTION_TIMEOUT"
  | "CONNECTION_RECONNECT_FAILED"
  | "CONNECTION_CLOSE_FAILED";

export class ConnectionError extends AtrocityError {
  constructor(
    code: ConnectionErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "ConnectionError";
  }
}
