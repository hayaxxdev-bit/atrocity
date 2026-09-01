import { AtrocityError } from "../../../../foundation/errors/index.js";

export type InboundMessageDecryptErrorCode =
  | "INBOUND_DECRYPT_INVALID_NODE"
  | "INBOUND_DECRYPT_MISSING_ENCRYPTION"
  | "INBOUND_DECRYPT_INVALID_CIPHERTEXT"
  | "INBOUND_DECRYPT_SESSION_FAILED"
  | "INBOUND_DECRYPT_FAILED";

export class InboundMessageDecryptError extends AtrocityError {
  constructor(
    code: InboundMessageDecryptErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "InboundMessageDecryptError";
  }
}
