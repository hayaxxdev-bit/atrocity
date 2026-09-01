import { AtrocityError } from "../../../foundation/errors/index.js";

export type PresenceFeatureErrorCode =
  | "PRESENCE_INVALID_NODE"
  | "PRESENCE_INVALID_STATUS"
  | "PRESENCE_MISSING_JID"
  | "PRESENCE_SEND_FAILED";

export class PresenceFeatureError extends AtrocityError {
  constructor(
    code: PresenceFeatureErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "PresenceFeatureError";
  }
}
