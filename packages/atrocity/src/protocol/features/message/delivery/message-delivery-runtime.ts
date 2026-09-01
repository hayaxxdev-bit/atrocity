import type { ProtocolNode } from "../../../node/index.js";
import {
  MessageDeliveryError,
} from "./message-delivery-errors.js";
import {
  MessageDeliveryTracker,
} from "./message-delivery-tracker.js";
import {
  mapWhatsAppMessageReceipt,
} from "./message-delivery-receipt-mapper.js";

export type MessageRetryExecutor = {
  readonly retry: (messageId: string) => Promise<void>;
};

export class MessageDeliveryRuntime {
  readonly tracker: MessageDeliveryTracker;

  constructor(
    tracker = new MessageDeliveryTracker(),
    private readonly retryExecutor?: MessageRetryExecutor,
  ) {
    this.tracker = tracker;
  }

  register(
    id: string,
    remoteJid: string,
  ): void {
    this.tracker.create({ id, remoteJid });
  }

  markEncrypted(id: string): void {
    this.tracker.transition(id, "encrypted");
  }

  markSent(id: string): void {
    this.tracker.transition(id, "sent");
  }

  async processReceipt(node: ProtocolNode): Promise<void> {
    const mapping = mapWhatsAppMessageReceipt(node);
    if (!mapping) return;

    this.tracker.transition(
      mapping.id,
      mapping.event,
      Date.now(),
      mapping.reason,
    );

    if (
      mapping.event === "retry" &&
      this.retryExecutor
    ) {
      await this.retryExecutor.retry(mapping.id);
    }
  }

  fail(
    id: string,
    reason: string,
  ): void {
    this.tracker.transition(
      id,
      "failed",
      Date.now(),
      reason,
    );
  }

  snapshot() {
    return this.tracker.snapshot();
  }
}
