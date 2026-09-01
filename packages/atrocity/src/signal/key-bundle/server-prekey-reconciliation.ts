import { PreKeyBundleError } from "./prekey-bundle-errors.js";
import type { PreKeyPool } from "./prekey-pool.js";
import type {
  PreKeyReconciliationDecision,
  PreKeyReconciliationPolicy,
  ServerPreKeyObservation,
} from "./server-prekey-reconciliation-types.js";

export class ServerPreKeyReconciler {
  constructor(
    private readonly policy: PreKeyReconciliationPolicy,
  ) {
    validatePolicy(policy);
  }

  observe(
    observation: ServerPreKeyObservation,
    pool: PreKeyPool,
  ): PreKeyReconciliationDecision {
    validateObservation(observation);

    const localAvailable = pool.availableCount;

    if (!observation.currentPreKeyExists) {
      return this.uploadDecision(
        "current-prekey-missing",
        observation,
        Math.max(
          0,
          Math.min(
            this.policy.targetCount - localAvailable,
            this.policy.maxUploadPerRun,
          ),
        ),
      );
    }

    if (observation.serverCount === 0) {
      return this.uploadDecision(
        "server-count-zero",
        observation,
        Math.max(
          0,
          Math.min(
            this.policy.targetCount - observation.serverCount,
            this.policy.maxUploadPerRun,
            localAvailable,
          ),
        ),
      );
    }

    if (
      observation.serverCount <
      this.policy.minServerCount
    ) {
      return this.uploadDecision(
        "server-count-below-threshold",
        observation,
        Math.max(
          0,
          Math.min(
            this.policy.targetCount - observation.serverCount,
            this.policy.maxUploadPerRun,
            localAvailable,
          ),
        ),
      );
    }

    return Object.freeze({
      kind: "no-action",
      reason: "pool-at-target",
      uploadCount: 0,
      serverCount: observation.serverCount,
      targetCount: this.policy.targetCount,
      currentPreKeyExists: observation.currentPreKeyExists,
    });
  }

  canSatisfyLocally(
    decision: PreKeyReconciliationDecision,
    pool: PreKeyPool,
  ): boolean {
    return pool.availableCount >= decision.uploadCount;
  }

  private uploadDecision(
    reason: PreKeyReconciliationDecision["reason"],
    observation: ServerPreKeyObservation,
    uploadCount: number,
  ): PreKeyReconciliationDecision {
    return Object.freeze({
      kind: uploadCount > 0 ? "upload" : "no-action",
      reason,
      uploadCount,
      serverCount: observation.serverCount,
      targetCount: this.policy.targetCount,
      currentPreKeyExists: observation.currentPreKeyExists,
    });
  }
}

function validatePolicy(
  policy: PreKeyReconciliationPolicy,
): void {
  if (
    !Number.isSafeInteger(policy.targetCount) ||
    !Number.isSafeInteger(policy.minServerCount) ||
    !Number.isSafeInteger(policy.maxUploadPerRun) ||
    policy.targetCount <= 0 ||
    policy.minServerCount < 0 ||
    policy.minServerCount > policy.targetCount ||
    policy.maxUploadPerRun <= 0
  ) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_INVALID",
      "Invalid server pre-key reconciliation policy.",
    );
  }
}

function validateObservation(
  observation: ServerPreKeyObservation,
): void {
  if (
    !Number.isSafeInteger(observation.serverCount) ||
    observation.serverCount < 0
  ) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_INVALID",
      "Server pre-key count must be a non-negative safe integer.",
    );
  }

  if (
    observation.currentPreKeyId !== undefined &&
    (!Number.isSafeInteger(observation.currentPreKeyId) ||
      observation.currentPreKeyId <= 0 ||
      observation.currentPreKeyId > 0xffffff)
  ) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_INVALID",
      "Current server pre-key id is invalid.",
    );
  }
}
