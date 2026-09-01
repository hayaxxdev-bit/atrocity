import type { ProtocolNode } from "../../node/index.js";
import { getAttribute, isPresence } from "../../semantics/index.js";
import { PresenceFeatureError } from "./presence-errors.js";
import type { PresenceEnvelope, PresenceStatus } from "./presence-types.js";

export class PresenceNormalizer {
  normalize(node: ProtocolNode): PresenceEnvelope {
    if (!isPresence(node)) {
      throw new PresenceFeatureError(
        "PRESENCE_INVALID_NODE",
        `Expected <presence>, received <${node.tag}>.`,
      );
    }

    const jid =
      getAttribute(node, "from") ??
      getAttribute(node, "jid") ??
      getAttribute(node, "to");

    const status = normalizeStatus(
      getAttribute(node, "type") ??
      getAttribute(node, "status"),
    );

    return Object.freeze({
      ...(jid ? { jid } : {}),
      status,
      ...(getAttribute(node, "participant")
        ? { participant: getAttribute(node, "participant") }
        : {}),
      ...(getAttribute(node, "t")
        ? { timestamp: parseTimestamp(getAttribute(node, "t")!) }
        : {}),
      raw: node,
    });
  }
}

function normalizeStatus(value: string | undefined): PresenceStatus {
  switch (value) {
    case undefined:
    case "":
    case "available":
      return "available";
    case "unavailable":
      return "unavailable";
    case "composing":
      return "composing";
    case "recording":
      return "recording";
    case "paused":
      return "paused";
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
