import { AtrocityError } from "../../../foundation/errors/index.js";

export type PreKeyBundleErrorCode =
  | "PREKEY_BUNDLE_INVALID"
  | "PREKEY_BUNDLE_EMPTY"
  | "PREKEY_BUNDLE_INVALID_KEY"
  | "PREKEY_BUNDLE_DUPLICATE_ID";

export class PreKeyBundleError extends AtrocityError {
  constructor(code: PreKeyBundleErrorCode, message: string) {
    super(code, message);
    this.name = "PreKeyBundleError";
  }
}
