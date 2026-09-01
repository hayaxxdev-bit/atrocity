import type { ProtocolAttributes } from "./protocol-attributes.js";
import type { ProtocolContent } from "./protocol-content.js";

export interface ProtocolNode {
  readonly tag: string;
  readonly attrs: ProtocolAttributes;
  readonly content?: ProtocolContent;
}

export function protocolNode(
  tag: string,
  attrs: ProtocolAttributes = {},
  content?: ProtocolContent,
): ProtocolNode {
  validateTag(tag);

  return Object.freeze({
    tag,
    attrs: Object.freeze({ ...attrs }),
    ...(content === undefined ? {} : { content: normalizeContent(content) }),
  });
}

function normalizeContent(content: ProtocolContent): ProtocolContent {
  switch (content.kind) {
    case "binary":
      return Object.freeze({
        kind: "binary",
        value: content.value.slice(),
      });
    case "text":
      return Object.freeze({
        kind: "text",
        value: content.value,
      });
    case "nodes":
      return Object.freeze({
        kind: "nodes",
        value: Object.freeze(content.value.map((node) => protocolNode(
          node.tag,
          node.attrs,
          node.content,
        ))),
      });
  }
}

function validateTag(tag: string): void {
  if (typeof tag !== "string" || tag.length === 0) {
    throw new TypeError("Protocol node tag must be a non-empty string.");
  }
}

export function hasContent(node: ProtocolNode): boolean {
  return node.content !== undefined;
}

export function isBinaryNode(node: ProtocolNode): boolean {
  return node.content?.kind === "binary";
}

export function isTextNode(node: ProtocolNode): boolean {
  return node.content?.kind === "text";
}

export function hasChildNodes(node: ProtocolNode): boolean {
  return node.content?.kind === "nodes";
}

export function childNodes(node: ProtocolNode): readonly ProtocolNode[] {
  return node.content?.kind === "nodes" ? node.content.value : [];
}

export function binaryContent(node: ProtocolNode): Uint8Array | undefined {
  return node.content?.kind === "binary" ? node.content.value : undefined;
}

export function textContent(node: ProtocolNode): string | undefined {
  return node.content?.kind === "text" ? node.content.value : undefined;
}
