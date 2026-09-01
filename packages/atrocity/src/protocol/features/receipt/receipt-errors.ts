import { AtrocityError } from "../../../foundation/errors/index.js";

export type ReceiptFeatureErrorCode =
  | "RECEIPT_INVALID_NODE"
  | "RECEIPT_MISSING_ID"
  | "RECEIPT_UNKNOWN_TYPE";

export class ReceiptFeatureError extends AtrocityError {
  constructor(
    code: ReceiptFeatureErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "ReceiptFeatureError";
  }
}
