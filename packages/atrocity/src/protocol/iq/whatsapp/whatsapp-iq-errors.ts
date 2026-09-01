import { AtrocityError } from "../../../foundation/errors/index.js";

export type WhatsAppIqErrorCode =
  | "WA_IQ_INVALID"
  | "WA_IQ_REQUIRED_FIELD";

export class WhatsAppIqError extends AtrocityError {
  constructor(code: WhatsAppIqErrorCode, message: string) {
    super(code, message);
    this.name = "WhatsAppIqError";
  }
}
