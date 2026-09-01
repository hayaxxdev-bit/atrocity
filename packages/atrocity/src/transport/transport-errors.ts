import { AtrocityError } from "../foundation/errors/index.js";

export type TransportErrorCode =
  | "TRANSPORT_NOT_OPEN"
  | "TRANSPORT_ALREADY_CONNECTING"
  | "TRANSPORT_CLOSED"
  | "TRANSPORT_INVALID_DATA"
  | "TRANSPORT_CONNECTION_FAILED"
  | "TRANSPORT_OPERATION_FAILED";

export class TransportError extends AtrocityError {
  constructor(
    code: TransportErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "TransportError";
  }
}
