import type { SignalKeyBundle, SignalSignedPreKeyMaterial } from "./prekey-bundle-types.js";
import type { PreKeyPool } from "./prekey-pool.js";
import type { PreKeyGenerator } from "./prekey-pool.js";
import type { ServerPreKeyObservation } from "./server-prekey-reconciliation-types.js";
import { ServerPreKeyReconciler } from "./server-prekey-reconciliation.js";
import { PreKeyUploadExecutor } from "./prekey-upload-executor.js";
import { SignedPreKeyRotationExecutor } from "./signed-prekey-rotation-executor.js";
import { KeyBundleDigestExchange } from "./key-bundle-digest-exchange.js";
import { KeyBundleRepairError } from "./key-bundle-repair-errors.js";
import type {
  KeyBundleRepairAction,
  KeyBundleRepairResult,
  KeyBundleRepairStage,
} from "./key-bundle-repair-types.js";

export type KeyBundleRepairDependencies = {
  readonly pool: PreKeyPool;
  readonly generatePreKey: PreKeyGenerator;
  readonly reconciler: ServerPreKeyReconciler;
  readonly upload: PreKeyUploadExecutor;
  readonly digest: KeyBundleDigestExchange;
  readonly currentBundle: () => SignalKeyBundle;
  readonly currentSignedPreKey: () => SignalSignedPreKeyMaterial;
  readonly rotateSignedPreKey: SignedPreKeyRotationExecutor;
  readonly serverObservation: () => Promise<ServerPreKeyObservation>;
  readonly serverRequiresSignedPreKeyRotation?: () => Promise<boolean>;
};

export class KeyBundleRepairOrchestrator {
  private stageValue: KeyBundleRepairStage = "created";

  constructor(
    private readonly dependencies: KeyBundleRepairDependencies,
  ) {}

  get stage(): KeyBundleRepairStage {
    return this.stageValue;
  }

  async repair(): Promise<KeyBundleRepairResult> {
    this.require("created");
    this.stageValue = "checking";

    try {
      const before = await this.dependencies.digest.query(
        this.dependencies.currentBundle(),
      );

      if (before.status === "match") {
        this.stageValue = "repaired";
        return Object.freeze({
          stage: "repaired",
          action: "none",
          uploadedPreKeyIds: Object.freeze([]),
          signedPreKeyRotated: false,
          verified: true,
        });
      }

      this.stageValue = "reconciling";
      const observation =
        await this.dependencies.serverObservation();

      const decision =
        this.dependencies.reconciler.observe(
          observation,
          this.dependencies.pool,
        );

      let uploadedPreKeyIds: number[] = [];
      let signedPreKeyRotated = false;
      let action: KeyBundleRepairAction = "none";

      if (decision.kind === "upload") {
        this.stageValue = "uploading-prekeys";

        const count =
          Math.max(
            0,
            Math.min(
              decision.uploadCount,
              this.dependencies.pool.availableCount,
            ),
          );

        if (count > 0) {
          const generated =
            this.dependencies.pool.generate(
              count,
              this.dependencies.generatePreKey,
            );

          const ids = generated.map((key) => key.id);
          this.dependencies.pool.markPendingUpload(ids);

          try {
            await this.dependencies.upload.execute(
              this.dependencies.pool,
              ids,
            );
          } catch (error) {
            throw new KeyBundleRepairError(
              "KEY_BUNDLE_REPAIR_UPLOAD_FAILED",
              "Pre-key repair upload failed.",
              { cause: error },
            );
          }

          uploadedPreKeyIds = [...ids];
          action = "upload-prekeys";
        }
      }

      const rotationRequired =
        this.dependencies.serverRequiresSignedPreKeyRotation
          ? await this.dependencies.serverRequiresSignedPreKeyRotation()
          : false;

      if (rotationRequired) {
        this.stageValue = "rotating-signed-prekey";
        try {
          await this.dependencies.rotateSignedPreKey.execute(
            this.dependencies.currentSignedPreKey(),
            "server-rejected",
          );
        } catch (error) {
          throw new KeyBundleRepairError(
            "KEY_BUNDLE_REPAIR_ROTATION_FAILED",
            "Signed pre-key repair rotation failed.",
            { cause: error },
          );
        }

        signedPreKeyRotated = true;
        action =
          action === "upload-prekeys"
            ? "upload-and-rotate"
            : "rotate-signed-prekey";
      }

      this.stageValue = "verifying";

      const after =
        await this.dependencies.digest.query(
          this.dependencies.currentBundle(),
        );

      if (after.status !== "match") {
        throw new KeyBundleRepairError(
          "KEY_BUNDLE_REPAIR_VERIFY_FAILED",
          "Key-bundle repair completed but final digest verification did not match.",
        );
      }

      this.stageValue = "repaired";

      return Object.freeze({
        stage: "repaired",
        action,
        uploadedPreKeyIds: Object.freeze(
          uploadedPreKeyIds,
        ),
        signedPreKeyRotated,
        verified: true,
      });
    } catch (error) {
      this.stageValue = "failed";

      if (error instanceof KeyBundleRepairError) {
        throw error;
      }

      throw new KeyBundleRepairError(
        "KEY_BUNDLE_REPAIR_FAILED",
        "Key-bundle repair failed.",
        { cause: error },
      );
    }
  }

  private require(
    expected: KeyBundleRepairStage,
  ): void {
    if (this.stageValue !== expected) {
      throw new KeyBundleRepairError(
        "KEY_BUNDLE_REPAIR_INVALID_STATE",
        `Expected stage ${expected}, current stage is ${this.stageValue}.`,
      );
    }
  }
}
