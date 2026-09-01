import { AtrocityError } from "../../foundation/errors/index.js";

export type StreamRuntimeErrorCode =
  | "STREAM_RUNTIME_INVALID_STATE"
  | "STREAM_RUNTIME_OPEN_FAILED"
  | "STREAM_RUNTIME_FEATURES_MISSING"
  | "STREAM_RUNTIME_PROTOCOL_FAILED"
  | "STREAM_RUNTIME_FAILED";

export class StreamRuntimeError extends AtrocityError {
  constructor(
    code: StreamRuntimeErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "StreamRuntimeError";
  }
}
