import assert from "node:assert/strict";
import test from "node:test";
import {
  SignedPreKeyRotation,
  KeyBundleReconciler,
  createKeyBundleDigest,
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

function bundle() {
  return {
    identityKey: {
      publicKey: new Uint8Array(32).fill(1),
      privateKey: new Uint8Array(32).fill(2),
    },
    registrationId: 10,
    signedPreKey: signed(1, 100),
    preKeys: [{
      id: 2,
      publicKey: new Uint8Array(32).fill(4),
      privateKey: new Uint8Array(32).fill(5),
    }],
  };
}

test("rotation is required once max age is reached", () => {
  const rotation = new SignedPreKeyRotation(
    { maxAgeMs: 100 },
    async (_identity, id, generatedAt) => signed(id, generatedAt),
  );

  assert.equal(
    rotation.shouldRotate(signed(1, 100), 200).required,
    true,
  );
  assert.equal(
    rotation.shouldRotate(signed(1, 100), 199).required,
    false,
  );
});

test("rotation increments signed pre-key id", async () => {
  const rotation = new SignedPreKeyRotation(
    { maxAgeMs: 100 },
    async (_identity, id, generatedAt) => signed(id, generatedAt),
  );

  const next = await rotation.rotate(
    bundle().identityKey,
    bundle().signedPreKey,
    "manual",
    200,
  );

  assert.equal(next.id, 2);
  assert.equal(next.generatedAt, 200);
});

test("bundle digest is stable against pre-key ordering", () => {
  const value = bundle();
  const digestA = createKeyBundleDigest(value);
  const digestB = createKeyBundleDigest({
    ...value,
    preKeys: [...value.preKeys].reverse(),
  });

  assert.deepEqual([...digestA], [...digestB]);
});

test("reconciler distinguishes matching and mismatching digests", () => {
  const value = bundle();
  const digest = createKeyBundleDigest(value);
  const reconciler = new KeyBundleReconciler();

  assert.equal(reconciler.compare(value, digest).status, "match");
  assert.equal(
    reconciler.compare(value, new Uint8Array(32)).status,
    "mismatch",
  );
});
