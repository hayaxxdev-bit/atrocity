import type { PreKeyPool, PreKeyGenerator } from "./prekey-pool.js";
import {
  ServerPreKeyReconciler,
  type ServerPreKeyObservation,
} from "./server-prekey-reconciliation.js";
import type { PreKeyReconciliationDecision } from "./server-prekey-reconciliation-types.js";

export type PreKeyReconciliationRunResult = {
  readonly decision: PreKeyReconciliationDecision;
  readonly generatedIds: readonly number[];
  readonly pendingUploadIds: readonly number[];
};

export class PreKeyReconciliationRunner {
  constructor(
    private readonly reconciler: ServerPreKeyReconciler,
  ) {}

  reconcile(
    observation: ServerPreKeyObservation,
    pool: PreKeyPool,
    generator: PreKeyGenerator,
    now = Date.now(),
  ): PreKeyReconciliationRunResult {
    const decision = this.reconciler.observe(
      observation,
      pool,
    );

    if (decision.kind === "no-action") {
      return Object.freeze({
        decision,
        generatedIds: Object.freeze([]),
        pendingUploadIds: Object.freeze([]),
      });
    }

    const generated =
      pool.generate(
        decision.uploadCount,
        generator,
        now,
      );

    const ids = generated.map((key) => key.id);

    pool.markPendingUpload(ids);

    return Object.freeze({
      decision,
      generatedIds: Object.freeze([...ids]),
      pendingUploadIds: Object.freeze([...ids]),
    });
  }
}
