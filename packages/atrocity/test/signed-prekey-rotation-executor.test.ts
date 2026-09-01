
import assert from "node:assert/strict";
import test from "node:test";
import {
  ActiveSignedPreKeyState,
  SignedPreKeyRotation,
  SignedPreKeyRotationExecutor,
} from "../src/signal/index.js";

function signed(id: number, generatedAt: number) {
  return {
    id,
    publicKey: new Uint8Array(32).fill(id),
    privateKey: new Uint8Array(32).fill(id + 1),
    signature: new Uint8Array(64).fill(id + 2),
    generatedAt,
  };
}

const identity = {
  publicKey: new Uint8Array(32).fill(1),
  privateKey: new Uint8Array(32).fill(2),
};

test("rotation commits only after successful encrypt/rotate IQ", async () => {
  const state = new ActiveSignedPreKeyState(signed(1, 1));
  const rotation = new SignedPreKeyRotation(
    { maxAgeMs: 10 },
    async (_identity, id, generatedAt) => signed(id, generatedAt),
  );

  const executor = new SignedPreKeyRotationExecutor({
    iq: {
      request: async (node) => {
        assert.equal(node.attrs.xmlns, "encrypt");
        assert.equal(node.content?.[0]?.tag, "rotate");
        return node;
      },
    },
    identity,
    rotation,
    nextIqId: () => "q1",
    persistActive: (next) => state.commit(next),
  });

  const result = await executor.execute(signed(1, 1), "age", 20);
  assert.equal(result.active.id, 2);
  assert.equal(state.get()?.id, 2);
});

test("failed rotation preserves previous active key", async () => {
  const old = signed(4, 1);
  const state = new ActiveSignedPreKeyState(old);
  const rotation = new SignedPreKeyRotation(
    { maxAgeMs: 10 },
    async (_identity, id, generatedAt) => signed(id, generatedAt),
  );

  const executor = new SignedPreKeyRotationExecutor({
    iq: { request: async () => { throw new Error("reject"); } },
    identity,
    rotation,
    nextIqId: () => "q2",
    persistActive: (next) => state.commit(next),
  });

  await assert.rejects(() => executor.execute(old, "server-rejected", 20));
  assert.equal(state.get()?.id, 4);
});
