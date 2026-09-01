import type { ProtocolNode } from "../node/index.js";
import {
  findChild,
  findChildren,
  hasAttributes,
  isAck,
  isIq,
  isMessage,
  isNotification,
  isPresence,
  isReceipt,
  requireAttribute,
} from "./node-semantics.js";

export function getIqType(
  node: ProtocolNode,
): string | undefined {
  return isIq(node) ? node.attrs.type : undefined;
}

export function isSuccessfulIq(node: ProtocolNode): boolean {
  return isIq(node) && node.attrs.type === "result";
}

export function isErrorIq(node: ProtocolNode): boolean {
  return isIq(node) && node.attrs.type === "error";
}

export function isMessageFrom(
  node: ProtocolNode,
  jid: string,
): boolean {
  return isMessage(node) && node.attrs.from === jid;
}

export function findNotificationChild(
  node: ProtocolNode,
  tag: string,
): ProtocolNode | undefined {
  if (!isNotification(node)) return undefined;
  return findChild(node, { tag });
}

export function findAckById(
  nodes: readonly ProtocolNode[],
  id: string,
): ProtocolNode | undefined {
  return nodes.find(
    (node) => isAck(node) && node.attrs.id === id,
  );
}

export function isReceiptFrom(
  node: ProtocolNode,
  jid?: string,
): boolean {
  return (
    isReceipt(node) &&
    (jid === undefined || node.attrs.from === jid)
  );
}

export function requireIqId(node: ProtocolNode): string {
  return requireAttribute(node, "id");
}

export function hasNodeAttributes(
  node: ProtocolNode,
  attrs: Readonly<Record<string, string>>,
): boolean {
  return hasAttributes(node, attrs);
}

export { findChild, findChildren };
