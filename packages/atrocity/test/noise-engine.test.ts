import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import { NoiseEngine, TEST_NOISE_PROFILE } from "../src/noise/index.js";

test("NoiseEngine produces a compatible bidirectional channel", () => {
  const crypto = new NodeCryptoProvider();
  const a = new NoiseEngine({ crypto, profile: TEST_NOISE_PROFILE }, "initiator");
  const b = new NoiseEngine({ crypto, profile: TEST_NOISE_PROFILE }, "responder");

  a.acceptRemoteEphemeral(b.ephemeral.publicKey);
  b.acceptRemoteEphemeral(a.ephemeral.publicKey);

  const ar = a.completeHandshake();
  const br = b.completeHandshake();

  assert.deepEqual([...ar.handshakeHash], [...br.handshakeHash]);

  const text = new TextEncoder().encode("hello");
  const encrypted = a.encrypt(text);
  const decrypted = b.decrypt(encrypted);

  assert.deepEqual([...decrypted], [...text]);
});
