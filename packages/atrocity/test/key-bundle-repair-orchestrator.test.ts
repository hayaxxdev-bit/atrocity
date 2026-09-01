import assert from "node:assert/strict";
import test from "node:test";
import {
  KeyBundleRepairOrchestrator,
  PreKeyPool,
  ServerPreKeyReconciler,
  KeyBundleDigestExchange,
  PreKeyUploadExecutor,
  SignedPreKeyRotation,
  SignedPreKeyRotationExecutor,
} from "../src/signal/index.js";

function bundle() {
  return {
    identityKey: {
      publicKey: new Uint8Array(32).fill(1),
      privateKey: new Uint8Array(32).fill(2),
    },
    registrationId: 10,
    signedPreKey: {
      id: 1,
      publicKey: new Uint8Array(32).fill(3),
      privateKey: new Uint8Array(32).fill(4),
      signature: new Uint8Array(64).fill(5),
      generatedAt: 1,
    },
    preKeys: [],
  };
}

test("healthy digest avoids repair mutations", async () => {
  const value = bundle();
  const pool = new PreKeyPool({
    targetCount: 2,
    replenishBelow: 1,
    maxCount: 4,
  });

  const digestExchange = new KeyBundleDigestExchange({
    iq: {
      request: async (node) => ({
        tag: "iq",
        attrs: {},
        content: [{
          tag: "digest",
          attrs: {},
          content: {
            kind: "binary",
            value: (await import("../src/signal/key-bundle/key-bundle-digest.js"))
              .createKeyBundleDigest(value),
          },
        }],
      }),
    },
    nextIqId: () => "q1",
  });

  let uploads = 0;
  const orchestrator = new KeyBundleRepairOrchestrator({
    pool,
    generatePreKey: () => ({
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
    }),
    reconciler: new ServerPreKeyReconciler({
      targetCount: 2,
      minServerCount: 1,
      maxUploadPerRun: 2,
    }),
    upload: new PreKeyUploadExecutor({
      iq: { request: async () => { uploads += 1; return ({}) as never; } },
      nextIqId: () => "q2",
    }),
    digest: digestExchange,
    currentBundle: () => value,
    currentSignedPreKey: () => value.signedPreKey,
    rotateSignedPreKey: new SignedPreKeyRotationExecutor({
      iq: { request: async () => ({}) },
      identity: value.identityKey,
      rotation: new SignedPreKeyRotation(
        { maxAgeMs: 100 },
        async (_i, id, at) => ({
          ...value.signedPreKey,
          id,
          generatedAt: at,
        }),
      ),
      nextIqId: () => "q3",
      persistActive: async () => {},
    }),
    serverObservation: async () => ({
      serverCount: 2,
      currentPreKeyExists: true,
    }),
  });

  const result = await orchestrator.repair();
  assert.equal(result.action, "none");
  assert.equal(result.verified, true);
  assert.equal(uploads, 0);
});

test("repair fails closed when final digest still mismatches", async () => {
  const value = bundle();
  const pool = new PreKeyPool({
    targetCount: 1,
    replenishBelow: 0,
    maxCount: 2,
  });

  let calls = 0;
  const exchange = new KeyBundleDigestExchange({
    iq: {
      request: async () => {
        calls += 1;
        return {
          tag: "iq",
          attrs: {},
          content: [{
            tag: "digest",
            attrs: {},
            content: {
              kind: "binary",
              value: new Uint8Array(32),
            },
          }],
        };
      },
    },
    nextIqId: () => `q${calls}`,
  });

  const rotation = new SignedPreKeyRotation({
    maxAgeMs: 100,
  }, async (_i, id, at) => ({
    ...value.signedPreKey,
    id,
    generatedAt: at,
  }));

  const orchestrator = new KeyBundleRepairOrchestrator({
    pool,
    generatePreKey: (id) => ({
      publicKey: new Uint8Array(32).fill(id),
      privateKey: new Uint8Array(32).fill(id + 1),
    }),
    reconciler: new ServerPreKeyReconciler({
      targetCount: 1,
      minServerCount: 1,
      maxUploadPerRun: 1,
    }),
    upload: new PreKeyUploadExecutor({
      iq: { request: async () => ({}) },
      nextIqId: () => "upload",
    }),
    digest: exchange,
    currentBundle: () => ({
      ...value,
      preKeys: [{
        id: 2,
        publicKey: new Uint8Array(32),
        privateKey: new Uint8Array(32),
      }],
    }),
    currentSignedPreKey: () => value.signedPreKey,
    rotateSignedPreKey: new SignedPreKeyRotationExecutor({
      iq: { request: async () => ({}) },
      identity: value.identityKey,
      rotation,
      nextIqId: () => "rotate",
      persistActive: async () => {},
    }),
    serverObservation: async () => ({
      serverCount: 0,
      currentPreKeyExists: false,
    }),
  });

  await assert.rejects(() => orchestrator.repair());
  assert.equal(orchestrator.stage, "failed");
});
