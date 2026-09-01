export type ServerPreKeyObservation = {
  readonly serverCount: number;
  readonly currentPreKeyId?: number;
  readonly currentPreKeyExists: boolean;
};

export type PreKeyReconciliationDecisionKind =
  | "no-action"
  | "upload";

export type PreKeyReconciliationReason =
  | "server-count-zero"
  | "server-count-below-threshold"
  | "current-prekey-missing"
  | "pool-at-target";

export type PreKeyReconciliationDecision = {
  readonly kind: PreKeyReconciliationDecisionKind;
  readonly reason: PreKeyReconciliationReason;
  readonly uploadCount: number;
  readonly serverCount: number;
  readonly targetCount: number;
  readonly currentPreKeyExists: boolean;
};

export type PreKeyReconciliationPolicy = {
  readonly targetCount: number;
  readonly minServerCount: number;
  readonly maxUploadPerRun: number;
};
