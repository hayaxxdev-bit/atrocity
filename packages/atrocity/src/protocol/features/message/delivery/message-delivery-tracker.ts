import {
  MessageDeliveryError,
} from "./message-delivery-errors.js";
import type {
  MessageDeliveryEvent,
  MessageDeliveryRecord,
  MessageDeliverySnapshot,
} from "./message-delivery-state.js";

export type MessageDeliveryInput = {
  readonly id: string;
  readonly remoteJid: string;
  readonly now?: number;
};

export class MessageDeliveryTracker {
  private readonly records = new Map<string, MessageDeliveryRecord>();

  create(input: MessageDeliveryInput): MessageDeliveryRecord {
    if (!input.id || !input.remoteJid) {
      throw new MessageDeliveryError(
        "MESSAGE_DELIVERY_INVALID_EVENT",
        "Message delivery record requires id and remoteJid.",
      );
    }

    if (this.records.has(input.id)) {
      throw new MessageDeliveryError(
        "MESSAGE_DELIVERY_INVALID_STATE",
        `Message ${input.id} already exists.`,
      );
    }

    const record = Object.freeze({
      id: input.id,
      remoteJid: input.remoteJid,
      state: "created" as const,
      attempts: 0,
      updatedAt: input.now ?? Date.now(),
    });

    this.records.set(input.id, record);
    return clone(record);
  }

  transition(
    id: string,
    event: MessageDeliveryEvent,
    now = Date.now(),
    reason?: string,
  ): MessageDeliveryRecord {
    const current = this.records.get(id);

    if (!current) {
      throw new MessageDeliveryError(
        "MESSAGE_DELIVERY_NOT_FOUND",
        `Message ${id} is not tracked.`,
      );
    }

    const next = nextState(current.state, event);

    if (!next) {
      throw new MessageDeliveryError(
        "MESSAGE_DELIVERY_INVALID_STATE",
        `Cannot apply ${event} to message ${id} in state ${current.state}.`,
      );
    }

    const updated = Object.freeze({
      ...current,
      state: next,
      attempts:
        event === "retry"
          ? current.attempts + 1
          : current.attempts,
      lastEvent: event,
      updatedAt: now,
      ...(reason ? { failureReason: reason } : {}),
    });

    this.records.set(id, updated);
    return clone(updated);
  }

  get(id: string): MessageDeliveryRecord | undefined {
    const record = this.records.get(id);
    return record ? clone(record) : undefined;
  }

  snapshot(): MessageDeliverySnapshot {
    return Object.freeze({
      records: Object.freeze(
        [...this.records.values()].map(clone),
      ),
    });
  }
}

function nextState(
  current: MessageDeliveryRecord["state"],
  event: MessageDeliveryEvent,
): MessageDeliveryRecord["state"] | undefined {
  switch (current) {
    case "created":
      return event === "encrypted" ? "encrypted" : undefined;
    case "encrypted":
      return event === "sent" ? "sent" : undefined;
    case "sent":
      if (event === "server-ack") return "server-acked";
      if (event === "retry") return "retry-required";
      if (event === "session-repair") return "session-repair-required";
      return undefined;
    case "server-acked":
      if (event === "delivered") return "delivered";
      if (event === "read") return "read";
      return undefined;
    case "delivered":
      return event === "read" ? "read" : undefined;
    case "retry-required":
      return event === "encrypted" ? "encrypted" : undefined;
    case "session-repair-required":
      return event === "encrypted" ? "encrypted" : undefined;
    case "read":
      return undefined;
    case "failed":
      return undefined;
  }
}

function clone(
  record: MessageDeliveryRecord,
): MessageDeliveryRecord {
  return Object.freeze({ ...record });
}
