import type { ProtocolNode } from "../node/index.js";
import { IqError } from "./iq-errors.js";
import type { IqType } from "./iq-types.js";

export function buildIq(
  id: string,
  type: IqType,
  attrs: Readonly<Record<string, string>> = {},
  ...content: readonly unknown[]
): ProtocolNode {
  if (!id) {
    throw new IqError(
      "IQ_INVALID_REQUEST",
      "IQ id cannot be empty.",
    );
  }

  if (!["get", "set", "result", "error"].includes(type)) {
    throw new IqError(
      "IQ_INVALID_REQUEST",
      `Unsupported IQ type: ${type}.`,
    );
  }

  return Object.freeze({
    tag: "iq",
    attrs: Object.freeze({
      ...attrs,
      id,
      type,
    }),
    content: Object.freeze([...content]),
  });
}

export function buildIqGet(
  id: string,
  content: readonly unknown[] = [],
  to?: string,
): ProtocolNode {
  return buildIq(
    id,
    "get",
    to ? { to } : {},
    ...content,
  );
}

export function buildIqSet(
  id: string,
  content: readonly unknown[] = [],
  to?: string,
): ProtocolNode {
  return buildIq(
    id,
    "set",
    to ? { to } : {},
    ...content,
  );
}

export function buildIqResult(
  id: string,
  content: readonly unknown[] = [],
): ProtocolNode {
  return buildIq(
    id,
    "result",
    {},
    ...content,
  );
}

export function buildIqError(
  id: string,
  content: readonly unknown[] = [],
): ProtocolNode {
  return buildIq(
    id,
    "error",
    {},
    ...content,
  );
}
