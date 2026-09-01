import { AtrocityError } from "../../../../../foundation/errors/index.js";

export type MessageRoundTripErrorCode =
  | "MESSAGE_ROUNDTRIP_INVALID"
  | "MESSAGE_ROUNDTRIP_ENCRYPT_FAILED"
  | "MESSAGE_ROUNDTRIP_DECRYPT_FAILED"
  | "MESSAGE_ROUNDTRIP_MISMATCH";

export class MessageRoundTripError extends AtrocityError {
  constructor(code: MessageRoundTripErrorCode, message: string, options: { cause?: unknown } = {}) {
    super(code, message, options);
    this.name = "MessageRoundTripError";
  }
}
