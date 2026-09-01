export type BinaryContent = {
  readonly kind: "binary";
  readonly value: Uint8Array;
};

export type TextContent = {
  readonly kind: "text";
  readonly value: string;
};

export type NodesContent = {
  readonly kind: "nodes";
  readonly value: readonly ProtocolNode[];
};

export type ProtocolContent = BinaryContent | TextContent | NodesContent;

import type { ProtocolNode } from "./protocol-node.js";
