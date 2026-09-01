import type { ProtocolNode } from "../node/index.js";
import type { ServerCapabilitySet } from "../sync/index.js";
import type { CapabilityNegotiationResult } from "../sync/index.js";
import type { ProtocolRuntimeSnapshot } from "../runtime/index.js";

export type StreamRuntimeState =
  | "created"
  | "authenticated"
  | "opening"
  | "features-received"
  | "capabilities-negotiated"
  | "protocol-started"
  | "ready"
  | "closing"
  | "closed"
  | "failed";

export type StreamRuntimeResult = {
  readonly state: "ready";
  readonly featuresNode: ProtocolNode;
  readonly capabilities: ServerCapabilitySet;
  readonly negotiation: CapabilityNegotiationResult;
  readonly protocol: ProtocolRuntimeSnapshot;
};
