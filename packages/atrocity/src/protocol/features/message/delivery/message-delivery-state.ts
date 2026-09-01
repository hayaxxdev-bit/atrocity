export type MessageDeliveryState =
  | "created"
  | "encrypted"
  | "sent"
  | "server-acked"
  | "delivered"
  | "read"
  | "retry-required"
  | "session-repair-required"
  | "failed";

export type MessageDeliveryEvent =
  | "encrypted"
  | "sent"
  | "server-ack"
  | "delivered"
  | "read"
  | "retry"
  | "session-repair"
  | "failed";

export type MessageDeliveryRecord = {
  readonly id: string;
  readonly remoteJid: string;
  readonly state: MessageDeliveryState;
  readonly attempts: number;
  readonly lastEvent?: MessageDeliveryEvent;
  readonly updatedAt: number;
  readonly failureReason?: string;
};

export type MessageDeliverySnapshot = {
  readonly records: readonly MessageDeliveryRecord[];
};
