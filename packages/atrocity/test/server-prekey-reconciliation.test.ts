import assert from "node:assert/strict";
import test from "node:test";
import {
  PreKeyPool,
  PreKeyReconciliationRunner,
  ServerPreKeyReconciler,
} from "../src/signal/index.js";

const generator = (id: number) => ({
  publicKey: new Uint8Array(32).fill(id),
  privateKey: new Uint8Array(32).fill(id + 1),
});

function poolWith(count: number): PreKeyPool {
  const pool = new PreKeyPool({
    targetCount: 10,
    replenishBelow: 2,
    maxCount: 12,
  });

  pool.generate(count, generator);
  pool.markPendingUpload(
    Array.from({ length: count }, (_, i) => i + 1),
  );
  pool.markUploaded(
    Array.from({ length: count }, (_, i) => i + 1),
  );

  return pool;
}

test("server count zero produces upload decision", () => {
  const reconciler = new ServerPreKeyReconciler({
    targetCount: 10,
    minServerCount: 3,
    maxUploadPerRun: 5,
  });

  const decision = reconciler.observe(
    {
      serverCount: 0,
      currentPreKeyId: 1,
      currentPreKeyExists: true,
    },
    poolWith(5),
  );

  assert.equal(decision.kind, "upload");
  assert.equal(decision.reason, "server-count-zero");
  assert.equal(decision.uploadCount, 5);
});

test("missing current prekey triggers repair path", () => {
  const reconciler = new ServerPreKeyReconciler({
    targetCount: 10,
    minServerCount: 3,
    maxUploadPerRun: 5,
  });

  const decision = reconciler.observe(
    {
      serverCount: 10,
      currentPreKeyId: 7,
      currentPreKeyExists: false,
    },
    poolWith(3),
  );

  assert.equal(decision.kind, "upload");
  assert.equal(decision.reason, "current-prekey-missing");
  assert.equal(decision.uploadCount, 5);
});

test("healthy server state is a no-op", () => {
  const reconciler = new ServerPreKeyReconciler({
    targetCount: 10,
    minServerCount: 3,
    maxUploadPerRun: 5,
  });

  const decision = reconciler.observe(
    {
      serverCount: 8,
      currentPreKeyId: 7,
      currentPreKeyExists: true,
    },
    poolWith(3),
  );

  assert.equal(decision.kind, "no-action");
  assert.equal(decision.uploadCount, 0);
});

test("runner materializes upload plan into pending pool state", () => {
  const pool = poolWith(0);
  const reconciler = new ServerPreKeyReconciler({
    targetCount: 4,
    minServerCount: 2,
    maxUploadPerRun: 4,
  });
  const runner = new PreKeyReconciliationRunner(reconciler);

  const result = runner.reconcile(
    {
      serverCount: 0,
      currentPreKeyExists: true,
    },
    pool,
    generator,
    10,
  );

  assert.equal(result.decision.kind, "upload");
  assert.deepEqual(result.generatedIds, [1, 2, 3, 4]);
  assert.deepEqual(result.pendingUploadIds, [1, 2, 3, 4]);
  assert.equal(pool.pendingUploadCount, 4);
});
