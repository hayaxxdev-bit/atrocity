import type { ProtocolNode } from "../../node/index.js";

export type ReceiptKind =
  | "sent"
  | "delivered"
  | "read"
  | "played"
  | "unknown";

export type ReceiptEnvelope = {
  readonly messageId: string;
  readonly from?: string;
  readonly participant?: string;
  readonly timestamp?: number;
  readonly kind: ReceiptKind;
  readonly raw: ProtocolNode;
};

export type ReceiptEvent = {
  readonly type: "receipt.received";
  readonly receipt: ReceiptEnvelope;
};
