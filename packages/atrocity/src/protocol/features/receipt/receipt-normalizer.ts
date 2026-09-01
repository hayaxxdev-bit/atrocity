import type { ProtocolNode } from "../../node/index.js";
import { getAttribute, isReceipt } from "../../semantics/index.js";
import { ReceiptFeatureError } from "./receipt-errors.js";
import type { ReceiptEnvelope, ReceiptKind } from "./receipt-types.js";

export class ReceiptNormalizer {
  normalize(node: ProtocolNode): ReceiptEnvelope {
    if (!isReceipt(node)) {
      throw new ReceiptFeatureError(
        "RECEIPT_INVALID_NODE",
        `Expected <receipt>, received <${node.tag}>.`,
      );
    }

    const messageId =
      getAttribute(node, "id") ??
      getAttribute(node, "message_id");

    if (!messageId) {
      throw new ReceiptFeatureError(
        "RECEIPT_MISSING_ID",
        "Receipt is missing message id.",
      );
    }

    const kind = normalizeKind(
      getAttribute(node, "type"),
    );

    return Object.freeze({
      messageId,
      ...(getAttribute(node, "from")
        ? { from: getAttribute(node, "from") }
        : {}),
      ...(getAttribute(node, "participant")
        ? { participant: getAttribute(node, "participant") }
        : {}),
      ...(getAttribute(node, "t")
        ? { timestamp: parseTimestamp(getAttribute(node, "t")!) }
        : {}),
      kind,
      raw: node,
    });
  }
}

function normalizeKind(value: string | undefined): ReceiptKind {
  switch (value) {
    case "sent":
    case "delivered":
    case "read":
    case "played":
      return value;
    case undefined:
    case "":
      return "unknown";
    default:
      return "unknown";
  }
}

function parseTimestamp(value: string): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0
    ? numeric
    : undefined;
}
