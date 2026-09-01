import {
  buildIqGet,
  buildIqSet,
} from "../iq-builders.js";
import type { ProtocolNode } from "../../node/index.js";
import { WhatsAppIqError } from "./whatsapp-iq-errors.js";
import { WHATSAPP_SERVER } from "./whatsapp-iq-types.js";

export function buildEncryptDigestIq(id: string): ProtocolNode {
  return buildIqGetWithNamespace(
    id,
    "encrypt",
    [node("digest")],
  );
}

export function buildEncryptPreKeyUploadIq(
  id: string,
  content: readonly ProtocolNode[],
): ProtocolNode {
  requireContent(content, "pre-key upload");

  return buildIqSetWithNamespace(
    id,
    "encrypt",
    [
      node("count", {}, text(String(content.length))),
      node("list", {}, nodes(content)),
    ],
  );
}

export function buildPassiveIq(
  id: string,
  tag: "active" | "passive",
): ProtocolNode {
  return buildIqSetWithNamespace(
    id,
    "passive",
    [node(tag)],
  );
}

export function buildRemoveCompanionDeviceIq(
  id: string,
  jid: string,
  reason = "user_initiated",
): ProtocolNode {
  if (!jid) {
    throw new WhatsAppIqError(
      "WA_IQ_REQUIRED_FIELD",
      "Companion device JID is required.",
    );
  }

  return buildIqSetWithNamespace(
    id,
    "md",
    [node("remove-companion-device", { jid, reason })],
  );
}

export function buildWamStatsIq(
  id: string,
  wamBuffer: Uint8Array,
  timestampSeconds: number,
): ProtocolNode {
  if (!(wamBuffer instanceof Uint8Array) || wamBuffer.byteLength === 0) {
    throw new WhatsAppIqError(
      "WA_IQ_REQUIRED_FIELD",
      "WAM statistics payload must be non-empty bytes.",
    );
  }

  if (!Number.isSafeInteger(timestampSeconds) || timestampSeconds < 0) {
    throw new WhatsAppIqError(
      "WA_IQ_INVALID",
      "WAM timestamp must be a non-negative safe integer.",
    );
  }

  return buildIqSetWithNamespace(
    id,
    "w:stats",
    [
      node(
        "add",
        { t: String(timestampSeconds) },
        binary(wamBuffer),
      ),
    ],
  );
}


function buildIqGetWithNamespace(
  id: string,
  xmlns: string,
  content: readonly ProtocolNode[],
): ProtocolNode {
  return {
    ...buildIqGet(id, content, WHATSAPP_SERVER),
    attrs: Object.freeze({
      ...buildIqGet(id, content, WHATSAPP_SERVER).attrs,
      xmlns,
    }),
  };
}

function buildIqSetWithNamespace(
  id: string,
  xmlns: string,
  content: readonly ProtocolNode[],
): ProtocolNode {
  return {
    ...buildIqSet(id, content, WHATSAPP_SERVER),
    attrs: Object.freeze({
      ...buildIqSet(id, content, WHATSAPP_SERVER).attrs,
      xmlns,
    }),
  };
}

function node(
  tag: string,
  attrs: Record<string, string> = {},
  content?: ProtocolNode["content"],
): ProtocolNode {
  return Object.freeze({
    tag,
    attrs: Object.freeze({ ...attrs }),
    ...(content === undefined ? {} : { content }),
  });
}

function text(value: string): ProtocolNode["content"] {
  return Object.freeze({
    kind: "text",
    value,
  });
}

function nodes(
  value: readonly ProtocolNode[],
): ProtocolNode["content"] {
  return Object.freeze({
    kind: "nodes",
    value: Object.freeze([...value]),
  });
}

function binary(value: Uint8Array): ProtocolNode["content"] {
  return Object.freeze({
    kind: "binary",
    value: value.slice(),
  });
}

function requireContent(
  content: readonly ProtocolNode[],
  operation: string,
): void {
  if (content.length === 0) {
    throw new WhatsAppIqError(
      "WA_IQ_REQUIRED_FIELD",
      `${operation} requires at least one content node.`,
    );
  }
}
