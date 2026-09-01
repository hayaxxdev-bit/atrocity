export type KeyBundleRepairStage =
  | "created"
  | "checking"
  | "reconciling"
  | "uploading-prekeys"
  | "rotating-signed-prekey"
  | "verifying"
  | "repaired"
  | "failed";

export type KeyBundleRepairAction =
  | "none"
  | "upload-prekeys"
  | "rotate-signed-prekey"
  | "upload-and-rotate";

export type KeyBundleRepairResult = {
  readonly stage: "repaired";
  readonly action: KeyBundleRepairAction;
  readonly uploadedPreKeyIds: readonly number[];
  readonly signedPreKeyRotated: boolean;
  readonly verified: boolean;
};
