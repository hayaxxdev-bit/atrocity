export type RoundTripWireFrame = {
  readonly direction: "outbound" | "inbound";
  readonly node: import("../../../node/index.js").ProtocolNode;
};

export type MessageRoundTripResult = {
  readonly status: "round-tripped";
  readonly outboundNode: import("../../../node/index.js").ProtocolNode;
  readonly inboundNode: import("../../../node/index.js").ProtocolNode;
  readonly originalPlaintext: Uint8Array;
  readonly recoveredPlaintext: Uint8Array;
  readonly signalType: "msg" | "pkmsg";
  readonly deliveryState: "server-acked";
};
