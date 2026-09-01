import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  NoiseEngine,
  NoiseSymmetricState,
  NoiseTransportCipher,
  TEST_NOISE_PROFILE,
} from "../src/noise/index.js";

test("Noise symmetric initialization pads short protocol names", () => {
  const crypto = new NodeCryptoProvider();
  const name = new TextEncoder().encode("Noise_Test");

  const state = new NoiseSymmetricState(crypto, "SHA-256", name);

  const expected = new Uint8Array(32);
  expected.set(name);

  assert.deepEqual([...state.handshakeHash], [...expected]);
  assert.deepEqual([...state.chainingKey], [...expected]);
});

test("two peers derive compatible transport channels", () => {
  const crypto = new NodeCryptoProvider();

  const initiator = new NoiseEngine({
    crypto,
    profile: TEST_NOISE_PROFILE,
  }, "initiator");

  const responder = new NoiseEngine({
    crypto,
    profile: TEST_NOISE_PROFILE,
  }, "responder");

  initiator.acceptRemoteEphemeral(responder.ephemeral.publicKey);
  responder.acceptRemoteEphemeral(initiator.ephemeral.publicKey);

  const a = initiator.completeHandshake();
  const b = responder.completeHandshake();

  assert.deepEqual([...a.handshakeHash], [...b.handshakeHash]);
  assert.equal(initiator.state, "transport-ready");
  assert.equal(responder.state, "transport-ready");

  const plaintext = new TextEncoder().encode("atrocity");
  const aad = new TextEncoder().encode("header");
  const ciphertext = initiator.encrypt(plaintext, aad);
  const decrypted = responder.decrypt(ciphertext, aad);

  assert.deepEqual([...decrypted], [...plaintext]);
});

test("CipherState leaves nonce unchanged after failed authentication", () => {
  const crypto = new NodeCryptoProvider();
  const key = new Uint8Array(32).fill(7);
  const sender = new NoiseTransportCipher(crypto, key);
  const receiver = new NoiseTransportCipher(crypto, key);
  const plaintext = new Uint8Array([1, 2, 3]);

  const ciphertext = sender.encryptWithAd(new Uint8Array(0), plaintext);
  const tampered = ciphertext.slice();
  tampered[0] ^= 0xff;

  assert.throws(() =>
    receiver.decryptWithAd(new Uint8Array(0), tampered)
  );
  assert.equal(receiver.nonce, 0n);

  const decrypted = receiver.decryptWithAd(
    new Uint8Array(0),
    ciphertext,
  );
  assert.deepEqual([...decrypted], [...plaintext]);
  assert.equal(receiver.nonce, 1n);
});

test("Noise engine does not expose transport secret keys through handshake result", () => {
  const crypto = new NodeCryptoProvider();
  const initiator = new NoiseEngine({
    crypto,
    profile: TEST_NOISE_PROFILE,
  }, "initiator");
  const responder = new NoiseEngine({
    crypto,
    profile: TEST_NOISE_PROFILE,
  }, "responder");

  initiator.acceptRemoteEphemeral(responder.ephemeral.publicKey);
  responder.acceptRemoteEphemeral(initiator.ephemeral.publicKey);

  const result = initiator.completeHandshake();
  assert.deepEqual(Object.keys(result), ["handshakeHash"]);
});
