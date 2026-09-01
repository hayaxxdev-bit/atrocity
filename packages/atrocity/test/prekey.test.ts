import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { NodeCryptoProvider, XEd25519Signer } from "../src/crypto/index.js";
import {
  MemoryPreKeyStore,
  PreKeyGenerator,
} from "../src/signal/index.js";

function signer(crypto: NodeCryptoProvider): XEd25519Signer {
  return new XEd25519Signer(
    (length) => new Uint8Array(randomBytes(length)),
    (data) => new Uint8Array(createHash("sha512").update(data).digest()),
  );
}

test("pre-key bundle uses the same Curve25519 identity key for signing", () => {
  const crypto = new NodeCryptoProvider();
  const xed = signer(crypto);
  const generator = new PreKeyGenerator(crypto, xed);
  const store = new MemoryPreKeyStore();

  generator.initializeStore(store, 12345, {
    oneTimePreKeyCount: 3,
    signedPreKeyId: 7,
    oneTimePreKeyStart: 100,
  });

  const bundle = generator.buildBundle(store);
  const identity = store.getIdentityKey()!;

  assert.equal(bundle.identityKey.byteLength, 32);
  assert.equal(
    xed.verify(
      identity.privateKey.length === 32
        ? identity.publicKey
        : bundle.identityKey,
      bundle.signedPreKey,
      bundle.signedPreKeySignature,
    ),
    true,
  );
  assert.equal(bundle.oneTimePreKeyId, 100);
});

test("one-time pre-key consumption is destructive", () => {
  const crypto = new NodeCryptoProvider();
  const generator = new PreKeyGenerator(crypto, signer(crypto));
  const store = new MemoryPreKeyStore();

  generator.initializeStore(store, 1, {
    oneTimePreKeyCount: 2,
    oneTimePreKeyStart: 20,
  });

  const consumed = generator.consumeOneTimePreKey(store, 20);
  assert.equal(consumed.keyId, 20);
  assert.deepEqual(store.listOneTimePreKeyIds(), [21]);
  assert.throws(() => generator.consumeOneTimePreKey(store, 20));
});
