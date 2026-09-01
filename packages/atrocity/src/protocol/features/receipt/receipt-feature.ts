import type { ProtocolNode } from "../../node/index.js";
import { ProtocolRegistry } from "../../registry/index.js";
import type { ProtocolFeature } from "../protocol-feature-types.js";
import type { ProtocolEventBus } from "../../events/index.js";
import { MessageDeliveryTracker } from "../message/message-delivery-tracker.js";
import { ReceiptFeatureError } from "./receipt-errors.js";
import { ReceiptNormalizer } from "./receipt-normalizer.js";
import type { ReceiptEnvelope, ReceiptEvent } from "./receipt-types.js";

export type ReceiptFeatureOptions = {
  readonly eventBus?: ProtocolEventBus;
  readonly tracker: MessageDeliveryTracker;
  readonly onEvent?: (event: ReceiptEvent) => void | Promise<void>;
};

export class ReceiptFeature {
  readonly normalizer = new ReceiptNormalizer();
  private unregisterRoute?: () => void;
  private readonly listeners = new Set<
    (event: ReceiptEvent) => void | Promise<void>
  >();

  constructor(
    private readonly registry: ProtocolRegistry,
    private readonly options: ReceiptFeatureOptions,
  ) {
    if (options.onEvent) this.listeners.add(options.onEvent);
  }

  onEvent(
    listener: (event: ReceiptEvent) => void | Promise<void>,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  createProtocolFeature(): ProtocolFeature {
    return Object.freeze({
      name: "receipt",
      version: 1,
      dependencies: ["message"],
      capabilities: [
        "protocol.receipt",
        "protocol.receipt.delivery",
      ],
      start: async () => {
        this.unregisterRoute = this.registry.register({
          name: "feature.receipt.inbound",
          tag: "receipt",
          priority: 60,
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
    const receipt = this.normalizer.normalize(node);
    const event: ReceiptEvent = Object.freeze({
      type: "receipt.received",
      receipt,
    });

    await this.applyDelivery(receipt);

    for (const listener of [...this.listeners]) {
      await listener(event);
    }

    if (this.options.eventBus) {
      await this.options.eventBus.emit("receipt.received", event);
    }
  }

  private async applyDelivery(
    receipt: ReceiptEnvelope,
  ): Promise<void> {
    const tracker = this.options.tracker;
    const current = tracker.get(receipt.messageId);

    if (!current) return;

    switch (receipt.kind) {
      case "sent":
        if (current.status === "created" || current.status === "queued") {
          await tracker.markSent(receipt.messageId, receipt.timestamp);
        }
        return;

      case "delivered":
        if (
          current.status === "created" ||
          current.status === "queued"
        ) {
          await tracker.markQueued(receipt.messageId, receipt.timestamp);
        }
        if (current.status !== "read") {
          if (
            tracker.get(receipt.messageId)?.status === "queued"
          ) {
            await tracker.markSent(
              receipt.messageId,
              receipt.timestamp,
            );
          }
          await tracker.markDelivered(
            receipt.messageId,
            receipt.timestamp,
          );
        }
        return;

      case "read":
      case "played":
        if (current.status === "created") {
          await tracker.markQueued(
            receipt.messageId,
            receipt.timestamp,
          );
        }
        if (
          tracker.get(receipt.messageId)?.status === "queued"
        ) {
          await tracker.markSent(
            receipt.messageId,
            receipt.timestamp,
          );
        }
        if (
          tracker.get(receipt.messageId)?.status === "sent"
        ) {
          await tracker.markDelivered(
            receipt.messageId,
            receipt.timestamp,
          );
        }
        if (
          tracker.get(receipt.messageId)?.status === "delivered"
        ) {
          await tracker.markRead(
            receipt.messageId,
            receipt.timestamp,
          );
        }
        return;

      case "unknown":
        return;

      default:
        throw new ReceiptFeatureError(
          "RECEIPT_UNKNOWN_TYPE",
          `Unsupported receipt type for ${receipt.messageId}.`,
        );
    }
  }
}
