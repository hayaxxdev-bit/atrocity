import type { ProtocolNode } from "../node/index.js";
import { findChild, isIq, isErrorIq } from "../semantics/index.js";
import { IqError } from "./iq-errors.js";

export type IqResult<T> = {
  readonly node: ProtocolNode;
  readonly value: T;
};

export type IqDecoder<T> = (
  node: ProtocolNode,
) => T;

export function decodeIqResult<T>(
  node: ProtocolNode,
  decoder: IqDecoder<T>,
): IqResult<T> {
  if (!isIq(node)) {
    throw new IqError(
      "IQ_REMOTE_ERROR",
      "Expected <iq> response node.",
    );
  }

  if (isErrorIq(node)) {
    throw new IqError(
      "IQ_REMOTE_ERROR",
      `Remote IQ error received for "${node.attrs.id ?? "unknown"}".`,
    );
  }

  if (node.attrs.type !== "result") {
    throw new IqError(
      "IQ_REMOTE_ERROR",
      `Expected IQ result, received "${node.attrs.type ?? "undefined"}".`,
    );
  }

  try {
    return Object.freeze({
      node,
      value: decoder(node),
    });
  } catch (error) {
    if (error instanceof IqError) throw error;
    throw new IqError(
      "IQ_REMOTE_ERROR",
      "Failed to decode IQ result.",
      { cause: error },
    );
  }
}

export function requireIqChild(
  node: ProtocolNode,
  tag: string,
): ProtocolNode {
  const child = findChild(node, { tag });

  if (!child) {
    throw new IqError(
      "IQ_REMOTE_ERROR",
      `IQ response is missing required child <${tag}>.`,
    );
  }

  return child;
}
