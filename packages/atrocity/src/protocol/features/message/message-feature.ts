import type { ProtocolNode } from "../../node/index.js";
import { ProtocolRegistry, type ProtocolHandlerContext } from "../../registry/index.js";
import type { ProtocolFeature } from "../protocol-feature-types.js";
import type { ProtocolEventBus } from "../../events/index.js";
import { MessageNormalizer } from "./message-normalizer.js";


import type { MessageEventType } from "./message-types.js";

export type MessageFeatureOptions = {
  readonly eventBus?: ProtocolEventBus;
  readonly onEvent?: (event: MessageEvent) => void | Promise<void>;
};

export class MessageFeature {
  readonly normalizer = new MessageNormalizer();
  private unregisterRoute?: () => void;
  private readonly listeners = new Set<
    (event: MessageEvent) => void | Promise<void>
  >();

  constructor(
    private readonly registry: ProtocolRegistry,
    options: MessageFeatureOptions = {},
  ) {
    if (options.onEvent) this.listeners.add(options.onEvent);
  }

  onEvent(
    listener: (event: MessageEvent) => void | Promise<void>,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  createProtocolFeature(): ProtocolFeature {
    return Object.freeze({
      name: "message",
      version: 1,
      dependencies: ["iq"],
      requiredServerCapabilities: ["messaging"],
      capabilities: ["protocol.message", "protocol.message.events"],
      start: async () => {
        this.unregisterRoute = this.registry.register({
          name: "feature.message.inbound",
          tag: "message",
          priority: 50,
          handler: async (node: ProtocolNode, _context: ProtocolHandlerContext) => {
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
    const message = this.normalizer.normalize(node);
    const eventType: MessageEventType = message.fromMe
      ? "message.sent"
      : message.kind === "unknown"
        ? "message.unknown"
        : "message.received";

    const event: MessageEvent = Object.freeze({
      type: eventType,
      message,
    });

    for (const listener of [...this.listeners]) {
      await listener(event);
    }

    if (this.options.eventBus) {
      await this.options.eventBus.emit(event.type, event);
    }
  }
}
