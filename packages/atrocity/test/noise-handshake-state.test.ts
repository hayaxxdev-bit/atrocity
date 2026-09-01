import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  NoiseHandshakeState,
  TEST_NOISE_PROFILE,
  TEST_NN_PATTERN,
  TEST_XX_PATTERN,
} from "../src/noise/index.js";

test("NN completes a full two-message handshake", () => {
  const crypto = new NodeCryptoProvider();

  const initiator = new NoiseHandshakeState({
    crypto,
    profile: TEST_NOISE_PROFILE,
    pattern: TEST_NN_PATTERN,
    role: "initiator",
  });

  const responder = new NoiseHandshakeState({
    crypto,
    profile: TEST_NOISE_PROFILE,
    pattern: TEST_NN_PATTERN,
    role: "responder",
  });

  const first = initiator.writeMessage(
    new TextEncoder().encode("hello"),
  );
  const firstRead = responder.readMessage(first);

  const second = responder.writeMessage(
    new TextEncoder().encode("world"),
  );
  const secondRead = initiator.readMessage(second);

  assert.equal(new TextDecoder().decode(firstRead.payload), "hello");
  assert.equal(new TextDecoder().decode(secondRead.payload), "world");
  assert.equal(initiator.complete, true);
  assert.equal(responder.complete, true);

  const [a1, a2] = initiator.split();
  const [b1, b2] = responder.split();

  const payload = new TextEncoder().encode("transport");
  const encrypted = a1.encryptWithAd(new Uint8Array(0), payload);
  assert.deepEqual(
    [...b1.decryptWithAd(new Uint8Array(0), encrypted)],
    [...payload],
  );

  const encryptedReverse = b2.encryptWithAd(new Uint8Array(0), payload);
  assert.deepEqual(
    [...a2.decryptWithAd(new Uint8Array(0), encryptedReverse)],
    [...payload],
  );
});

test("XX completes and protects static keys after a DH", () => {
  const crypto = new NodeCryptoProvider();
  const initiatorStatic = crypto.generateX25519KeyPair();
  const responderStatic = crypto.generateX25519KeyPair();

  const initiator = new NoiseHandshakeState({
    crypto,
    profile: TEST_NOISE_PROFILE,
    pattern: TEST_XX_PATTERN,
    role: "initiator",
    staticKey: initiatorStatic,
  });

  const responder = new NoiseHandshakeState({
    crypto,
    profile: TEST_NOISE_PROFILE,
    pattern: TEST_XX_PATTERN,
    role: "responder",
    staticKey: responderStatic,
  });

  const one = initiator.writeMessage();
  responder.readMessage(one);

  const two = responder.writeMessage(
    new TextEncoder().encode("responder-payload"),
  );
  const twoRead = initiator.readMessage(two);

  const three = initiator.writeMessage(
    new TextEncoder().encode("initiator-payload"),
  );
  const threeRead = responder.readMessage(three);

  assert.equal(new TextDecoder().decode(twoRead.payload), "responder-payload");
  assert.equal(new TextDecoder().decode(threeRead.payload), "initiator-payload");
  assert.deepEqual(
    [...initiator.remoteStatic!],
    [...responderStatic.publicKey],
  );
  assert.deepEqual(
    [...responder.remoteStatic!],
    [...initiatorStatic.publicKey],
  );
});

test("handshake rejects wrong local/remote turn", () => {
  const crypto = new NodeCryptoProvider();
  const initiator = new NoiseHandshakeState({
    crypto,
    profile: TEST_NOISE_PROFILE,
    pattern: TEST_NN_PATTERN,
    role: "initiator",
  });

  assert.throws(() => initiator.readMessage(new Uint8Array([1, 2, 3])));
});
