import { MessageDeliveryError } from "./message-delivery-errors.js";
import type {
  MessageDeliveryEvent,
  MessageDeliveryEventType,
  MessageDeliveryRecord,
  MessageDeliveryStatus,
} from "./message-delivery-types.js";

export type MessageDeliveryListener = (
  event: MessageDeliveryEvent,
) => void | Promise<void>;

const ORDER: Record<MessageDeliveryStatus, number> = {
  created: 0,
  queued: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  failed: 99,
};

export class MessageDeliveryTracker {
  private readonly records = new Map<string, MessageDeliveryRecord>();
  private readonly listeners = new Set<MessageDeliveryListener>();
  private queues = new Map<string, Promise<void>>();

  onEvent(listener: MessageDeliveryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  create(
    id: string,
    remoteJid: string,
    now = Date.now(),
  ): MessageDeliveryRecord {
    if (!id || !remoteJid) {
      throw new MessageDeliveryError(
        "MESSAGE_DELIVERY_INVALID_STATE",
        "Message delivery requires id and remote JID.",
      );
    }

    if (this.records.has(id)) {
      throw new MessageDeliveryError(
        "MESSAGE_DELIVERY_DUPLICATE",
        `Message "${id}" already exists.`,
      );
    }

    const record: MessageDeliveryRecord = Object.freeze({
      id,
      remoteJid,
      status: "created",
      createdAt: now,
      updatedAt: now,
    });

    this.records.set(id, record);
    void this.emit("message.created", record);
    return record;
  }

  get(id: string): MessageDeliveryRecord | undefined {
    return this.records.get(id);
  }

  list(): readonly MessageDeliveryRecord[] {
    return Object.freeze([...this.records.values()]);
  }

  async transition(
    id: string,
    next: Exclude<MessageDeliveryStatus, "created">,
    options: {
      readonly now?: number;
      readonly failure?: unknown;
    } = {},
  ): Promise<MessageDeliveryRecord> {
    return this.serialize(id, async () => {
      const current = this.records.get(id);

      if (!current) {
        throw new MessageDeliveryError(
          "MESSAGE_DELIVERY_NOT_FOUND",
          `Message "${id}" is not tracked.`,
        );
      }

      validateTransition(current.status, next);

      const now = options.now ?? Date.now();
      const record: MessageDeliveryRecord = Object.freeze({
        ...current,
        status: next,
        updatedAt: now,
        ...(next === "sent" ? { sentAt: now } : {}),
        ...(next === "delivered" ? { deliveredAt: now } : {}),
        ...(next === "read" ? { readAt: now } : {}),
        ...(next === "failed" ? { failure: options.failure } : {}),
      });

      this.records.set(id, record);
      await this.emit(eventFor(next), record);
      return record;
    });
  }

  markQueued(id: string, now?: number): Promise<MessageDeliveryRecord> {
    return this.transition(id, "queued", { now });
  }

  markSent(id: string, now?: number): Promise<MessageDeliveryRecord> {
    return this.transition(id, "sent", { now });
  }

  markDelivered(id: string, now?: number): Promise<MessageDeliveryRecord> {
    return this.transition(id, "delivered", { now });
  }

  markRead(id: string, now?: number): Promise<MessageDeliveryRecord> {
    return this.transition(id, "read", { now });
  }

  markFailed(
    id: string,
    failure: unknown,
    now?: number,
  ): Promise<MessageDeliveryRecord> {
    return this.transition(id, "failed", { failure, now });
  }

  delete(id: string): boolean {
    return this.records.delete(id);
  }

  private async serialize<T>(
    id: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const current = previous.then(operation, operation);

    this.queues.set(
      id,
      current.then(() => undefined, () => undefined),
    );

    try {
      return await current;
    } finally {
      if (this.queues.get(id) === current) {
        this.queues.delete(id);
      }
    }
  }

  private async emit(
    type: MessageDeliveryEventType,
    message: MessageDeliveryRecord,
  ): Promise<void> {
    const event: MessageDeliveryEvent = Object.freeze({
      type,
      message,
    });

    for (const listener of [...this.listeners]) {
      await listener(event);
    }
  }
}

function validateTransition(
  current: MessageDeliveryStatus,
  next: MessageDeliveryStatus,
): void {
  if (current === "failed") {
    throw new MessageDeliveryError(
      "MESSAGE_DELIVERY_INVALID_STATE",
      "A failed message requires explicit retry semantics.",
    );
  }

  if (next !== "failed" && ORDER[next] < ORDER[current]) {
    throw new MessageDeliveryError(
      "MESSAGE_DELIVERY_REGRESSION",
      `Invalid delivery regression ${current} → ${next}.`,
    );
  }

  const allowed: Record<MessageDeliveryStatus, readonly MessageDeliveryStatus[]> = {
    created: ["queued", "failed"],
    queued: ["sent", "failed"],
    sent: ["delivered", "read", "failed"],
    delivered: ["read", "failed"],
    read: [],
    failed: [],
  };

  if (!allowed[current].includes(next)) {
    throw new MessageDeliveryError(
      "MESSAGE_DELIVERY_INVALID_STATE",
      `Invalid delivery transition ${current} → ${next}.`,
    );
  }
}

function eventFor(
  status: Exclude<MessageDeliveryStatus, "created">,
): MessageDeliveryEventType {
  switch (status) {
    case "queued": return "message.queued";
    case "sent": return "message.sent";
    case "delivered": return "message.delivered";
    case "read": return "message.read";
    case "failed": return "message.failed";
  }
}
