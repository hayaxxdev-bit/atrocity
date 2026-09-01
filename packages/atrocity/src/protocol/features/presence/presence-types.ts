import type { ProtocolNode } from "../../node/index.js";

export type PresenceStatus =
  | "available"
  | "unavailable"
  | "composing"
  | "recording"
  | "paused"
  | "unknown";

export type PresenceEnvelope = {
  readonly jid?: string;
  readonly status: PresenceStatus;
  readonly participant?: string;
  readonly timestamp?: number;
  readonly raw: ProtocolNode;
};

export type PresenceEvent = {
  readonly type: "presence.received";
  readonly presence: PresenceEnvelope;
};

export type PresenceSendInput = {
  readonly jid: string;
  readonly status: Exclude<PresenceStatus, "unknown">;
};
