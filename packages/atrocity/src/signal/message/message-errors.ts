import { AtrocityError } from "../../foundation/errors/index.js";

export type MessageCryptoErrorCode =
  | "MESSAGE_INVALID_HEADER"
  | "MESSAGE_INVALID_CIPHERTEXT"
  | "MESSAGE_AUTH_FAILED"
  | "MESSAGE_KEY_UNAVAILABLE"
  | "MESSAGE_SERIALIZATION_FAILED";

export class MessageCryptoError extends AtrocityError {
  constructor(
    code: MessageCryptoErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "MessageCryptoError";
  }
}
