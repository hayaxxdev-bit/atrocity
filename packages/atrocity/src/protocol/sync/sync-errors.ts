import { AtrocityError } from "../../foundation/errors/index.js";

export type SyncErrorCode =
  | "SYNC_INVALID_STATE"
  | "SYNC_TIMEOUT"
  | "SYNC_FEATURES_INVALID"
  | "SYNC_BOOTSTRAP_FAILED"
  | "SYNC_INCOMPLETE";

export class SyncError extends AtrocityError {
  constructor(
    code: SyncErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "SyncError";
  }
}
