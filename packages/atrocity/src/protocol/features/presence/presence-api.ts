import type { ProtocolNode } from "../../node/index.js";
import { PresenceFeatureError } from "./presence-errors.js";
import { PresenceNodeBuilder } from "./presence-builder.js";
import type { PresenceStatus } from "./presence-types.js";

export type PresenceSendDelegate = {
  readonly sendNode: (node: ProtocolNode) => Promise<void>;
};

export class PresenceApi {
  readonly builder: PresenceNodeBuilder;

  constructor(
    private readonly transport: PresenceSendDelegate,
    builder = new PresenceNodeBuilder(),
  ) {
    this.builder = builder;
  }

  async set(
    jid: string,
    status: Exclude<PresenceStatus, "unknown">,
  ): Promise<ProtocolNode> {
    try {
      const node = this.builder.build({
        jid,
        status,
      });

      await this.transport.sendNode(node);
      return node;
    } catch (error) {
      if (error instanceof PresenceFeatureError) throw error;
      throw new PresenceFeatureError(
        "PRESENCE_SEND_FAILED",
        `Failed to send presence for "${jid}".`,
        { cause: error },
      );
    }
  }

  available(jid: string): Promise<ProtocolNode> {
    return this.set(jid, "available");
  }

  unavailable(jid: string): Promise<ProtocolNode> {
    return this.set(jid, "unavailable");
  }

  composing(jid: string): Promise<ProtocolNode> {
    return this.set(jid, "composing");
  }

  recording(jid: string): Promise<ProtocolNode> {
    return this.set(jid, "recording");
  }

  paused(jid: string): Promise<ProtocolNode> {
    return this.set(jid, "paused");
  }
}
