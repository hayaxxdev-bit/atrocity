import { AtrocityError } from "../../foundation/errors/index.js";

export type PostAuthenticationErrorCode =
  | "POST_AUTH_INVALID_STATE"
  | "POST_AUTH_PREKEY_FAILED"
  | "POST_AUTH_CREDENTIALS_FAILED"
  | "POST_AUTH_PRESENCE_FAILED"
  | "POST_AUTH_KEY_BUNDLE_FAILED"
  | "POST_AUTH_FAILED";

export class PostAuthenticationError extends AtrocityError {
  constructor(
    code: PostAuthenticationErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "PostAuthenticationError";
  }
}
