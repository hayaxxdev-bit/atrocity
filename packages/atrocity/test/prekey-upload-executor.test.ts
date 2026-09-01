
import assert from "node:assert/strict";
import test from "node:test";
import { PreKeyPool, PreKeyUploadExecutor } from "../src/signal/index.js";

const generator = (id: number) => ({
  publicKey: new Uint8Array(32).fill(id),
  privateKey: new Uint8Array(32).fill(id + 1),
});

function pendingPool() {
  const pool = new PreKeyPool({
    targetCount: 2,
    replenishBelow: 1,
    maxCount: 4,
  });
  pool.generate(2, generator);
  pool.markPendingUpload([1, 2]);
  return pool;
}

test("successful IQ commits pending keys as uploaded", async () => {
  const pool = pendingPool();
  let sent = false;

  const executor = new PreKeyUploadExecutor({
    iq: {
      request: async (node) => {
        sent = true;
        assert.equal(node.attrs.xmlns, "encrypt");
        return node;
      },
    },
    nextIqId: () => "iq-1",
  });

  const result = await executor.execute(pool, [1, 2]);

  assert.equal(sent, true);
  assert.equal(result.status, "uploaded");
  assert.equal(pool.uploadedCount, 2);
  assert.equal(pool.pendingUploadCount, 0);
});

test("failed IQ leaves keys pending for retry", async () => {
  const pool = pendingPool();

  const executor = new PreKeyUploadExecutor({
    iq: {
      request: async () => {
        throw new Error("server unavailable");
      },
    },
    nextIqId: () => "iq-2",
  });

  await assert.rejects(() => executor.execute(pool, [1, 2]));
  assert.equal(pool.pendingUploadCount, 2);
  assert.deepEqual(pool.pendingUploadIds(), [1, 2]);
});

test("generated key cannot be uploaded before reconciliation marks it pending", async () => {
  const pool = new PreKeyPool({
    targetCount: 1,
    replenishBelow: 0,
    maxCount: 2,
  });
  pool.generate(1, generator);

  const executor = new PreKeyUploadExecutor({
    iq: {
      request: async () => {
        throw new Error("should not send");
      },
    },
    nextIqId: () => "iq-3",
  });

  await assert.rejects(() => executor.execute(pool, [1]));
  assert.equal(pool.get(1)?.state, "generated");
});
