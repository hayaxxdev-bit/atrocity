import { AtrocityError } from "../../../foundation/errors/index.js";

export type MessageFeatureErrorCode =
  | "MESSAGE_INVALID_NODE"
  | "MESSAGE_MISSING_ID"
  | "MESSAGE_MISSING_REMOTE"
  | "MESSAGE_UNSUPPORTED";

export class MessageFeatureError extends AtrocityError {
  constructor(code: MessageFeatureErrorCode, message: string, options: { cause?: unknown } = {}) {
    super(code, message, options);
    this.name = "MessageFeatureError";
  }
}
