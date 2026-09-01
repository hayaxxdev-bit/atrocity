import type { MessageEvent } from "../features/message/message-types.js";
import type { ReceiptEvent } from "../features/receipt/receipt-types.js";
import type { PresenceEvent } from "../features/presence/presence-types.js";
import type { ProtocolNode } from "../node/index.js";

export type ProtocolEventMap = {
  "protocol.node": {
    readonly node: ProtocolNode;
    readonly receivedAt: number;
  };
  "message.received": MessageEvent;
  "message.sent": MessageEvent;
  "message.unknown": MessageEvent;
  "receipt.received": ReceiptEvent;
  "presence.received": PresenceEvent;
};

export type ProtocolEventName = keyof ProtocolEventMap;
export type ProtocolEventPayload<Name extends ProtocolEventName> =
  ProtocolEventMap[Name];

export type ProtocolEventListener<Name extends ProtocolEventName> = (
  payload: ProtocolEventPayload<Name>,
) => void | Promise<void>;
