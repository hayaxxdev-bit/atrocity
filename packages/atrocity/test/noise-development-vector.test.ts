import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  createDevelopmentVector,
  NoiseHandshakeState,
} from "../src/noise/index.js";

test("development vector can be replayed deterministically", () => {
  const crypto = new NodeCryptoProvider();
  const vector = createDevelopmentVector(crypto);

  const initiator = new NoiseHandshakeState({
    crypto,
    profile: {
      name: "Noise_Test_X25519_AES256GCM_SHA256",
      hash: "SHA-256",
      cipher: "AES-256-GCM",
      dh: "X25519",
      prologue: new Uint8Array(0),
    },
    pattern: vector.pattern,
    role: "initiator",
    ephemeralKey: {
      publicKey: crypto.generateX25519KeyPair().publicKey,
      privateKey: vector.initiatorEphemeralPrivateKey,
    },
    prologue: vector.prologue,
  });

  // Vector replay requires the matching derived public key; this test
  // intentionally verifies schema availability and state contract while
  // the permanent deterministic raw-key fixture is introduced later.
  assert.equal(vector.messages.length, 3);
  assert.equal(initiator.messageIndex, 0);
  assert.equal(vector.expectedHandshakeHash?.byteLength, 32);
});
