import { AtrocityError } from "../../../../foundation/errors/index.js";

export type MessageRetryErrorCode =
  | "MESSAGE_RETRY_INVALID_STATE"
  | "MESSAGE_RETRY_INVALID_INPUT"
  | "MESSAGE_RETRY_ENCRYPT_FAILED"
  | "MESSAGE_RETRY_SESSION_REPAIR_FAILED"
  | "MESSAGE_RETRY_SEND_FAILED"
  | "MESSAGE_RETRY_FAILED";

export class MessageRetryError extends AtrocityError {
  constructor(
    code: MessageRetryErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "MessageRetryError";
  }
}
