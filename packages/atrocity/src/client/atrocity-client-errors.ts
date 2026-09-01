import { AtrocityError } from "../foundation/errors/index.js";

export type AtrocityClientErrorCode =
  | "CLIENT_INVALID_STATE"
  | "CLIENT_NOT_CONFIGURED"
  | "CLIENT_PROTOCOL_UNAVAILABLE"
  | "CLIENT_OPERATION_FAILED";

export class AtrocityClientError extends AtrocityError {
  constructor(
    code: AtrocityClientErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "AtrocityClientError";
  }
}
