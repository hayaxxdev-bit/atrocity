import { AtrocityError } from "../../foundation/errors/index.js";

export type WAMessageCodecErrorCode =
  | "WA_MESSAGE_ENCODE_FAILED"
  | "WA_MESSAGE_DECODE_FAILED"
  | "WA_MESSAGE_INVALID";

export class WAMessageCodecError extends AtrocityError {
  constructor(code: WAMessageCodecErrorCode, message: string, options: { cause?: unknown } = {}) {
    super(code, message, options);
    this.name = "WAMessageCodecError";
  }
}
