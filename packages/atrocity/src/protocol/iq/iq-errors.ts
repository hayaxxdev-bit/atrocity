import { AtrocityError } from "../../foundation/errors/index.js";

export type IqErrorCode =
  | "IQ_INVALID_REQUEST"
  | "IQ_TIMEOUT"
  | "IQ_ABORTED"
  | "IQ_REMOTE_ERROR"
  | "IQ_CONNECTION_CLOSED"
  | "IQ_DUPLICATE_ID";

export class IqError extends AtrocityError {
  constructor(
    code: IqErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "IqError";
  }
}
