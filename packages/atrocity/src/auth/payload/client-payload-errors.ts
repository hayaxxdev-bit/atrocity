import { AtrocityError } from "../../foundation/errors/index.js";

export type ClientPayloadErrorCode =
  | "CLIENT_PAYLOAD_INVALID"
  | "CLIENT_PAYLOAD_TOO_LARGE"
  | "CLIENT_PAYLOAD_MALFORMED"
  | "CLIENT_PAYLOAD_UNSUPPORTED";

export class ClientPayloadError extends AtrocityError {
  constructor(
    code: ClientPayloadErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "ClientPayloadError";
  }
}
