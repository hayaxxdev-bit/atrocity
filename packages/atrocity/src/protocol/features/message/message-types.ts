import type { ProtocolNode } from "../../node/index.js";

export type MessageDirection = "inbound" | "outbound";

export type MessageKind =
  | "text"
  | "media"
  | "document"
  | "sticker"
  | "reaction"
  | "location"
  | "contact"
  | "system"
  | "unknown";

export type MessageEnvelope = {
  readonly key: {
    readonly id: string;
    readonly remoteJid: string;
  };
  readonly fromMe: boolean;
  readonly direction: MessageDirection;
  readonly participant?: string;
  readonly pushName?: string;
  readonly timestamp?: number;
  readonly kind: MessageKind;
  readonly text?: string;
  readonly raw: ProtocolNode;
};

export type MessageEventType =
  | "message.received"
  | "message.sent"
  | "message.unknown";

export type MessageEvent = {
  readonly type: MessageEventType;
  readonly message: MessageEnvelope;
};
