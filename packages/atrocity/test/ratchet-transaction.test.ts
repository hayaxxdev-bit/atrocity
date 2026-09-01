import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  DHRatchet,
  RatchetReceiver,
} from "../src/signal/index.js";

test("failed decrypt rolls back skipped-key consumption and ratchet state", () => {
  const crypto = new NodeCryptoProvider();
  const local = crypto.generateX25519KeyPair();
  const remote = crypto.generateX25519KeyPair();

  const ratchet = new DHRatchet(
    crypto,
    new Uint8Array(32).fill(1),
    local,
  );

  const receiver = new RatchetReceiver(crypto, ratchet);

  const header = {
    dh: remote.publicKey,
    pn: 0n,
    n: 0n,
  };

  const before = ratchet.state;

  assert.throws(() =>
    receiver.receiveAndDecrypt(
      header,
      () => {
        throw new Error("authentication failed");
      },
    ),
  );

  const after = ratchet.state;

  assert.deepEqual([...after.rootKey.key], [...before.rootKey.key]);
  assert.equal(after.rootKey.generation, before.rootKey.generation);
  assert.deepEqual([...after.sendRatchetKey!.publicKey], [...before.sendRatchetKey!.publicKey]);
  assert.equal(receiver.skippedKeyCount, 0);
});

test("successful decrypt commits derived state", () => {
  const crypto = new NodeCryptoProvider();
  const local = crypto.generateX25519KeyPair();
  const remote = crypto.generateX25519KeyPair();

  const ratchet = new DHRatchet(
    crypto,
    new Uint8Array(32).fill(2),
    local,
  );

  const receiver = new RatchetReceiver(crypto, ratchet);
  const before = ratchet.state;

  const plaintext = new Uint8Array([1, 2, 3]);
  const output = receiver.receiveAndDecrypt(
    {
      dh: remote.publicKey,
      pn: 0n,
      n: 0n,
    },
    () => plaintext,
  );

  assert.deepEqual([...output], [1, 2, 3]);
  assert.notDeepEqual([...ratchet.state.rootKey.key], [...before.rootKey.key]);
});
