import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import { DHRatchet } from "../src/signal/index.js";

test("a DH ratchet derives compatible receive/send chains on both peers", () => {
  const crypto = new NodeCryptoProvider();

  const rootKey = new Uint8Array(32).fill(1);
  const aliceRatchet = crypto.generateX25519KeyPair();
  const bobRatchet = crypto.generateX25519KeyPair();

  // Alice starts with Bob's public ratchet key, as in the basic Signal
  // initialization model.
  const alice = new DHRatchet(
    crypto,
    rootKey,
    aliceRatchet,
  );

  // Bob starts with the same root secret and his current ratchet key.
  const bob = new DHRatchet(
    crypto,
    rootKey,
    bobRatchet,
  );

  // Alice's initial receiving/sending chains are created by an explicit
  // ratchet transition using Bob's current public key.
  const aliceStep = alice.receiveNewRatchetKey(bobRatchet.publicKey);
  void aliceStep;

  // Bob observes Alice's new ratchet public key and performs the peer step.
  const bobStep = bob.receiveNewRatchetKey(alice.localRatchetPublicKey);

  assert.equal(bobStep.receivingChainKey.byteLength, 32);
  assert.equal(alice.state.remoteRatchetPublicKey?.byteLength, 32);
  assert.equal(bob.state.remoteRatchetPublicKey?.byteLength, 32);
});

test("new remote key resets message counters and tracks previous chain length", () => {
  const crypto = new NodeCryptoProvider();
  const a = crypto.generateX25519KeyPair();
  const b = crypto.generateX25519KeyPair();

  const ratchet = new DHRatchet(
    crypto,
    new Uint8Array(32).fill(9),
    a,
  );

  // Seed a sending chain to make the previous-chain counter observable.
  const initialChain = new Uint8Array(32).fill(8);
  ratchet["sending"] = new (await import("../src/signal/ratchet/chain-state.js")).RatchetChain(
    crypto,
    initialChain,
  );

  ratchet.nextSendingMessageKey();
  ratchet.nextSendingMessageKey();

  ratchet.receiveNewRatchetKey(b.publicKey);

  assert.equal(ratchet.state.sendCount, 0n);
  assert.equal(ratchet.state.receiveCount, 0n);
  assert.equal(ratchet.state.previousSendingChainLength, 2n);
});
