import { AtrocityError } from "../../foundation/errors/index.js";

export type ProtocolEventErrorCode =
  | "PROTOCOL_EVENT_INVALID"
  | "PROTOCOL_EVENT_HANDLER_FAILED";

export class ProtocolEventError extends AtrocityError {
  constructor(
    code: ProtocolEventErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "ProtocolEventError";
  }
}
