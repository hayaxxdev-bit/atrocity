import { AtrocityError } from "../../../foundation/errors/index.js";

export type KeyBundleDigestExchangeErrorCode =
  | "KEY_BUNDLE_DIGEST_QUERY_FAILED"
  | "KEY_BUNDLE_DIGEST_INVALID";

export class KeyBundleDigestExchangeError extends AtrocityError {
  constructor(
    code: KeyBundleDigestExchangeErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "KeyBundleDigestExchangeError";
  }
}
