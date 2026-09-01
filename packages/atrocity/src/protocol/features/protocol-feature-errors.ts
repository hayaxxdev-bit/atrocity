import { AtrocityError } from "../../foundation/errors/index.js";

export type ProtocolFeatureErrorCode =
  | "FEATURE_INVALID"
  | "FEATURE_DUPLICATE"
  | "FEATURE_DEPENDENCY_MISSING"
  | "FEATURE_DEPENDENCY_CYCLE"
  | "FEATURE_START_FAILED"
  | "FEATURE_STOP_FAILED"
  | "FEATURE_NOT_FOUND";

export class ProtocolFeatureError extends AtrocityError {
  constructor(
    code: ProtocolFeatureErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "ProtocolFeatureError";
  }
}
