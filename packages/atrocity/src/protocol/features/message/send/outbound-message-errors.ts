import { AtrocityError } from "../../../../foundation/errors/index.js";
export type OutboundMessageErrorCode = "OUTBOUND_MESSAGE_INVALID" | "OUTBOUND_MESSAGE_SERIALIZATION_FAILED" | "OUTBOUND_MESSAGE_DEVICE_RESOLUTION_FAILED" | "OUTBOUND_MESSAGE_ENCRYPT_FAILED" | "OUTBOUND_MESSAGE_BUILD_FAILED" | "OUTBOUND_MESSAGE_SEND_FAILED";
export class OutboundMessageError extends AtrocityError { constructor(code: OutboundMessageErrorCode, message: string, options: { cause?: unknown } = {}) { super(code, message, options); this.name="OutboundMessageError"; } }
