import { AtrocityError } from "../../../../foundation/errors/index.js";

export type MessageDeliveryErrorCode =
  | "MESSAGE_DELIVERY_INVALID_STATE"
  | "MESSAGE_DELIVERY_NOT_FOUND"
  | "MESSAGE_DELIVERY_INVALID_EVENT";

export class MessageDeliveryError extends AtrocityError {
  constructor(code: MessageDeliveryErrorCode, message: string) {
    super(code, message);
    this.name = "MessageDeliveryError";
  }
}
