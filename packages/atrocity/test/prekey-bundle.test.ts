import assert from "node:assert/strict";
import test from "node:test";
import {
  PreKeyBundleStateStore,
  WhatsAppPreKeyExchange,
  validateSignalKeyBundle,
} from "../src/signal/index.js";
import { protocolNode } from "../src/protocol/index.js";

function bundle() {
  const b = (n: number, value: number) =>
    new Uint8Array(n).fill(value);

  return {
    identityKey: {
      publicKey: b(32, 1),
      privateKey: b(32, 2),
    },
    registrationId: 123,
    signedPreKey: {
      id: 1,
      publicKey: b(32, 3),
      privateKey: b(32, 4),
      signature: b(64, 5),
      generatedAt: 10,
    },
    preKeys: [
      {
        id: 2,
        publicKey: b(32, 6),
        privateKey: b(32, 7),
      },
    ],
  };
}

test("Signal key bundle validation enforces key sizes and ids", () => {
  const value = bundle();
  validateSignalKeyBundle(value);
});

test("empty pre-key bundle is rejected", () => {
  const value = bundle();
  assert.throws(() =>
    validateSignalKeyBundle({
      ...value,
      preKeys: [],
    }),
  );
});

test("state store clones sensitive key material", () => {
  const value = bundle();
  const store = new PreKeyBundleStateStore();

  store.set({
    bundle: value,
    uploadedPreKeyCount: 1,
    digest: new Uint8Array([1, 2, 3]),
  });

  value.identityKey.publicKey[0] = 99;
  const stored = store.get()!;
  assert.equal(stored.bundle.identityKey.publicKey[0], 1);
  assert.deepEqual([...stored.digest!], [1, 2, 3]);
});

test("WhatsApp pre-key exchange delegates serialization", () => {
  const exchange = new WhatsAppPreKeyExchange({
    serializePreKey: () => [
      protocolNode("item", { id: "2" }),
    ],
  });

  const iq = exchange.buildUploadIq("q1", bundle());

  assert.equal(iq.tag, "iq");
  assert.equal(iq.attrs.xmlns, "encrypt");
  assert.equal(iq.attrs.type, "set");
});
