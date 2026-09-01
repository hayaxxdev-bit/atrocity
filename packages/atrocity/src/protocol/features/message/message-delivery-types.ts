export type MessageDeliveryStatus =
  | "created"
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type MessageDeliveryRecord = {
  readonly id: string;
  readonly remoteJid: string;
  readonly status: MessageDeliveryStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly sentAt?: number;
  readonly deliveredAt?: number;
  readonly readAt?: number;
  readonly failure?: unknown;
};

export type MessageDeliveryEventType =
  | "message.created"
  | "message.queued"
  | "message.sent"
  | "message.delivered"
  | "message.read"
  | "message.failed";

export type MessageDeliveryEvent = {
  readonly type: MessageDeliveryEventType;
  readonly message: MessageDeliveryRecord;
};
