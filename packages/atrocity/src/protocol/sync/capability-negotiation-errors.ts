import { AtrocityError } from "../../foundation/errors/index.js";

export type CapabilityNegotiationErrorCode =
  | "CAPABILITY_NEGOTIATION_INVALID"
  | "CAPABILITY_REQUIRED_UNAVAILABLE";

export class CapabilityNegotiationError extends AtrocityError {
  constructor(
    code: CapabilityNegotiationErrorCode,
    message: string,
  ) {
    super(code, message);
    this.name = "CapabilityNegotiationError";
  }
}
