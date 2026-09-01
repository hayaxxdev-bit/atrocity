import type { ProtocolNode } from "../../../node/index.js";
import type { MessageDeliveryEvent } from "./message-delivery-state.js";

export type MessageReceiptMapping = {
  readonly id: string;
  readonly event: MessageDeliveryEvent;
  readonly reason?: string;
};

export function mapWhatsAppMessageReceipt(
  node: ProtocolNode,
): MessageReceiptMapping | undefined {
  const id = node.attrs.id;
  if (!id) return undefined;

  const type = node.attrs.type;

  if (type === "retry" || hasChild(node, "retry")) {
    return Object.freeze({
      id,
      event: "retry",
      reason: "server retry request",
    });
  }

  if (type === "error" || type === "nack") {
    return Object.freeze({
      id,
      event: "session-repair",
      reason: type,
    });
  }

  if (type === "server-ack" || type === "ack") {
    return Object.freeze({
      id,
      event: "server-ack",
    });
  }

  if (type === "delivered") {
    return Object.freeze({
      id,
      event: "delivered",
    });
  }

  if (type === "read") {
    return Object.freeze({
      id,
      event: "read",
    });
  }

  return undefined;
}

function hasChild(
  node: ProtocolNode,
  tag: string,
): boolean {
  return node.content?.kind === "nodes" &&
    node.content.value.some((child) => child.tag === tag);
}
