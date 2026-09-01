import { AtrocityError } from "../../../foundation/errors/index.js";

export type KeyBundleRepairErrorCode =
  | "KEY_BUNDLE_REPAIR_INVALID_STATE"
  | "KEY_BUNDLE_REPAIR_REQUIRED"
  | "KEY_BUNDLE_REPAIR_UPLOAD_FAILED"
  | "KEY_BUNDLE_REPAIR_ROTATION_FAILED"
  | "KEY_BUNDLE_REPAIR_VERIFY_FAILED"
  | "KEY_BUNDLE_REPAIR_FAILED";

export class KeyBundleRepairError extends AtrocityError {
  constructor(
    code: KeyBundleRepairErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "KeyBundleRepairError";
  }
}
