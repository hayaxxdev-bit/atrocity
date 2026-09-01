import type { ProtocolNode } from "../../node/index.js";
import { findChild, getAttribute, isMessage } from "../../semantics/index.js";
import { MessageFeatureError } from "./message-errors.js";
import type { MessageEnvelope, MessageKind } from "./message-types.js";

export class MessageNormalizer {
  normalize(node: ProtocolNode): MessageEnvelope {
    if (!isMessage(node)) {
      throw new MessageFeatureError(
        "MESSAGE_INVALID_NODE",
        `Expected <message>, received <${node.tag}>.`,
      );
    }

    const id = getAttribute(node, "id");
    if (!id) {
      throw new MessageFeatureError(
        "MESSAGE_MISSING_ID",
        "Message node is missing id.",
      );
    }

    const remoteJid =
      getAttribute(node, "chat") ??
      getAttribute(node, "from") ??
      getAttribute(node, "to");

    if (!remoteJid) {
      throw new MessageFeatureError(
        "MESSAGE_MISSING_REMOTE",
        `Message "${id}" does not identify a remote JID.`,
      );
    }

    const fromMe =
      getAttribute(node, "from_me") === "1" ||
      getAttribute(node, "fromMe") === "true";

    const body = findChild(node, { tag: "body" }) ??
      findChild(node, { tag: "conversation" });

    const text = extractText(body?.content);

    return Object.freeze({
      key: Object.freeze({ id, remoteJid }),
      fromMe,
      direction: fromMe ? "outbound" : "inbound",
      ...(getAttribute(node, "participant")
        ? { participant: getAttribute(node, "participant") }
        : {}),
      ...(getAttribute(node, "notify")
        ? { pushName: getAttribute(node, "notify") }
        : {}),
      ...(getAttribute(node, "t")
        ? { timestamp: parseTimestamp(getAttribute(node, "t")!) }
        : {}),
      kind: inferKind(node),
      ...(text === undefined ? {} : { text }),
      raw: node,
    });
  }
}

function inferKind(node: ProtocolNode): MessageKind {
  if (findChild(node, { tag: "reaction" })) return "reaction";
  if (
    findChild(node, { tag: "imageMessage" }) ||
    findChild(node, { tag: "videoMessage" }) ||
    findChild(node, { tag: "audioMessage" })
  ) return "media";
  if (findChild(node, { tag: "documentMessage" })) return "document";
  if (findChild(node, { tag: "stickerMessage" })) return "sticker";
  if (findChild(node, { tag: "locationMessage" })) return "location";
  if (findChild(node, { tag: "contactMessage" })) return "contact";
  if (findChild(node, { tag: "systemMessage" })) return "system";
  if (findChild(node, { tag: "body" }) || findChild(node, { tag: "conversation" })) return "text";
  return "unknown";
}

function extractText(content: readonly unknown[] | undefined): string | undefined {
  if (!content) return undefined;
  for (const value of content) {
    if (typeof value === "string") return value;
    if (value instanceof Uint8Array && value.byteLength > 0) {
      return new TextDecoder().decode(value);
    }
  }
  return undefined;
}

function parseTimestamp(value: string): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}
