export type SignedPreKeyRotationReason =
  | "age"
  | "server-rejected"
  | "manual";

export type SignedPreKeyRotationPolicy = {
  readonly maxAgeMs: number;
};

export type SignedPreKeyRotationDecision = {
  readonly required: boolean;
  readonly reason?: SignedPreKeyRotationReason;
};
