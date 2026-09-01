import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  RatchetChain,
  SkippedMessageKeyStore,
  skipMessageKeys,
  trySkippedMessageKey,
} from "../src/signal/index.js";

test("skipped message keys are stored and consumed exactly once", () => {
  const crypto = new NodeCryptoProvider();
  const chain = new RatchetChain(
    crypto,
    new Uint8Array(32).fill(1),
  );
  const store = new SkippedMessageKeyStore({
    maxTotalKeys: 10,
    maxPerChain: 10,
  });
  const ratchetKey = new Uint8Array(32).fill(9);

  skipMessageKeys(
    chain,
    store,
    {
      remoteRatchetPublicKey: ratchetKey,
      currentReceiveNumber: 0n,
    },
    3n,
    10n,
  );

  assert.equal(store.size, 3);
  const first = trySkippedMessageKey(store, ratchetKey, 1n);
  assert.equal(first?.byteLength, 32);
  assert.equal(store.size, 2);
  assert.equal(
    trySkippedMessageKey(store, ratchetKey, 1n),
    undefined,
  );
});

test("MAX_SKIP prevents unbounded derivation", () => {
  const crypto = new NodeCryptoProvider();
  const chain = new RatchetChain(
    crypto,
    new Uint8Array(32).fill(1),
  );
  const store = new SkippedMessageKeyStore();

  assert.throws(() =>
    skipMessageKeys(
      chain,
      store,
      {
        remoteRatchetPublicKey: new Uint8Array(32),
        currentReceiveNumber: 0n,
      },
      201n,
      200n,
    )
  );
});

test("store limits are enforced", () => {
  const store = new SkippedMessageKeyStore({
    maxTotalKeys: 1,
    maxPerChain: 1,
  });

  const key = new Uint8Array(32).fill(1);
  const msgKey = new Uint8Array(32).fill(2);

  store.put(key, 0n, msgKey);

  assert.throws(() => store.put(key, 1n, msgKey));
});
