import { AtrocityError } from "../../foundation/errors/index.js";

export type WhatsAppNoiseFrameErrorCode =
  | "WA_NOISE_FRAME_INVALID"
  | "WA_NOISE_FRAME_TOO_LARGE"
  | "WA_NOISE_FRAME_HEADER_MISMATCH"
  | "WA_NOISE_FRAME_MALFORMED";

export class WhatsAppNoiseFrameError extends AtrocityError {
  constructor(
    code: WhatsAppNoiseFrameErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "WhatsAppNoiseFrameError";
  }
}
