import { AtrocityError } from "../../foundation/errors/index.js";

export type ProtocolRuntimeErrorCode =
  | "PROTOCOL_RUNTIME_INVALID_STATE"
  | "PROTOCOL_RUNTIME_START_FAILED"
  | "PROTOCOL_RUNTIME_STOP_FAILED"
  | "PROTOCOL_RUNTIME_NODE_TOO_LARGE"
  | "PROTOCOL_RUNTIME_DISPATCH_FAILED";

export class ProtocolRuntimeError extends AtrocityError {
  constructor(
    code: ProtocolRuntimeErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "ProtocolRuntimeError";
  }
}
