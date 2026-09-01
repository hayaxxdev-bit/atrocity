import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import { CredentialGenerator } from "../src/auth/index.js";

test("signed pre-key signature is an actual Ed25519 signature", () => {
  const crypto = new NodeCryptoProvider();
  const credentials = new CredentialGenerator(crypto).generate();

  assert.equal(
    crypto.verify(
      "Ed25519",
      credentials.identitySigningKey.publicKey,
      credentials.signedPreKey.publicKey,
      credentials.signedPreKey.signature,
    ),
    true,
  );
});
