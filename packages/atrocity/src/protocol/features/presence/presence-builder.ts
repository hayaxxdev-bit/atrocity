import type { ProtocolNode } from "../../node/index.js";
import { PresenceFeatureError } from "./presence-errors.js";
import type { PresenceSendInput } from "./presence-types.js";

export class PresenceNodeBuilder {
  build(input: PresenceSendInput): ProtocolNode {
    if (!input.jid || input.jid.length > 512) {
      throw new PresenceFeatureError(
        "PRESENCE_MISSING_JID",
        "Presence JID must be non-empty and at most 512 characters.",
      );
    }

    if (
      ![
        "available",
        "unavailable",
        "composing",
        "recording",
        "paused",
      ].includes(input.status)
    ) {
      throw new PresenceFeatureError(
        "PRESENCE_INVALID_STATUS",
        `Unsupported presence status "${input.status}".`,
      );
    }

    return Object.freeze({
      tag: "presence",
      attrs: Object.freeze({
        to: input.jid,
        type: input.status,
      }),
      content: Object.freeze([]),
    });
  }
}
