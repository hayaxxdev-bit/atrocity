import type { ProtocolNode } from "../node/index.js";

export type SyncStage =
  | "idle"
  | "starting"
  | "stream-ready"
  | "features-discovered"
  | "bootstrap-sent"
  | "initial-state-received"
  | "completed"
  | "failed";

export type ProtocolFeatureSet = {
  readonly namespaces: readonly string[];
  readonly tags: readonly string[];
};

export type SyncCheckpoint = {
  readonly stage: SyncStage;
  readonly updatedAt: number;
  readonly sequence: number;
};

export type InitialSyncResult = {
  readonly features: ProtocolFeatureSet;
  readonly capabilities: import("./server-capability-types.js").ServerCapabilitySet;
  readonly negotiation: import("./capability-negotiation-types.js").CapabilityNegotiationResult;
  readonly checkpoint: SyncCheckpoint;
  readonly initialNodes: readonly ProtocolNode[];
};
