import { AtrocityError } from "../../foundation/errors/index.js";

export type WhatsAppAuthErrorCode =
  | "WHATSAPP_AUTH_INVALID_STATE"
  | "WHATSAPP_AUTH_STATE_MISSING"
  | "WHATSAPP_AUTH_HANDSHAKE_FAILED"
  | "WHATSAPP_AUTH_PAYLOAD_FAILED"
  | "WHATSAPP_AUTH_TRANSPORT_FAILED"
  | "WHATSAPP_AUTH_PERSISTENCE_FAILED";

export class WhatsAppAuthError extends AtrocityError {
  constructor(
    code: WhatsAppAuthErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "WhatsAppAuthError";
  }
}
