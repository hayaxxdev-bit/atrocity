import { AtrocityError } from "../../foundation/errors/index.js";

export type WhatsAppMessageEncryptorErrorCode =
  | "MESSAGE_ENCRYPT_INVALID_JID"
  | "MESSAGE_ENCRYPT_EMPTY_PAYLOAD"
  | "MESSAGE_ENCRYPT_FAILED";

export class WhatsAppMessageEncryptorError extends AtrocityError {
  constructor(
    code: WhatsAppMessageEncryptorErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "WhatsAppMessageEncryptorError";
  }
}
