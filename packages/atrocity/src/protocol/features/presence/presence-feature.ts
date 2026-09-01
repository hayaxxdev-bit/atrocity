import type { ProtocolNode } from "../../node/index.js";
import { ProtocolRegistry } from "../../registry/index.js";
import type { ProtocolFeature } from "../protocol-feature-types.js";
import type { ProtocolEventBus } from "../../events/index.js";
import { PresenceNormalizer } from "./presence-normalizer.js";
import type { PresenceEvent } from "./presence-types.js";

export type PresenceFeatureOptions = {
  readonly eventBus?: ProtocolEventBus;
  readonly onEvent?: (event: PresenceEvent) => void | Promise<void>;
};

export class PresenceFeature {
  readonly normalizer = new PresenceNormalizer();
  private unregisterRoute?: () => void;
  private readonly listeners = new Set<
    (event: PresenceEvent) => void | Promise<void>
  >();

  constructor(
    private readonly registry: ProtocolRegistry,
    options: PresenceFeatureOptions = {},
  ) {
    if (options.onEvent) this.listeners.add(options.onEvent);
  }

  onEvent(
    listener: (event: PresenceEvent) => void | Promise<void>,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  createProtocolFeature(): ProtocolFeature {
    return Object.freeze({
      name: "presence",
      version: 1,
      dependencies: ["iq"],
      requiredServerCapabilities: ["presence"],
      capabilities: [
        "protocol.presence",
        "protocol.presence.events",
      ],
      start: async () => {
        this.unregisterRoute = this.registry.register({
          name: "feature.presence.inbound",
          tag: "presence",
          priority: 40,
          handler: async (node) => {
            await this.handleNode(node);
          },
        });
      },
      stop: async () => {
        this.unregisterRoute?.();
        this.unregisterRoute = undefined;
      },
    });
  }

  private async handleNode(node: ProtocolNode): Promise<void> {
    const presence = this.normalizer.normalize(node);

    const event: PresenceEvent = Object.freeze({
      type: "presence.received",
      presence,
    });

    for (const listener of [...this.listeners]) {
      await listener(event);
    }

    if (this.options.eventBus) {
      await this.options.eventBus.emit("presence.received", event);
    }
  }
}
