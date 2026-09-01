import { AtrocityError } from "../../../foundation/errors/index.js";

export type MessageDeliveryErrorCode =
  | "MESSAGE_DELIVERY_INVALID_STATE"
  | "MESSAGE_DELIVERY_NOT_FOUND"
  | "MESSAGE_DELIVERY_REGRESSION"
  | "MESSAGE_DELIVERY_DUPLICATE";

export class MessageDeliveryError extends AtrocityError {
  constructor(
    code: MessageDeliveryErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "MessageDeliveryError";
  }
}
