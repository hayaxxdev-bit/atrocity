import { AtrocityError } from "../../foundation/errors/index.js";

export type ProtocolRegistryErrorCode =
  | "PROTOCOL_ROUTE_INVALID"
  | "PROTOCOL_ROUTE_DUPLICATE"
  | "PROTOCOL_DISPATCH_FAILED";

export class ProtocolRegistryError extends AtrocityError {
  constructor(
    code: ProtocolRegistryErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "ProtocolRegistryError";
  }
}
