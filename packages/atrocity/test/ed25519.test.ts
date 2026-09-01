import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";

test("Ed25519 sign/verify round trip", () => {
  const crypto = new NodeCryptoProvider();
  const key = crypto.generateEd25519KeyPair();
  const message = new TextEncoder().encode("atrocity");
  const signature = crypto.sign("Ed25519", key.privateKey, message);

  assert.equal(signature.byteLength, 64);
  assert.equal(
    crypto.verify("Ed25519", key.publicKey, message, signature),
    true,
  );
});

test("Ed25519 rejects tampering", () => {
  const crypto = new NodeCryptoProvider();
  const key = crypto.generateEd25519KeyPair();
  const message = new TextEncoder().encode("atrocity");
  const signature = crypto.sign("Ed25519", key.privateKey, message);
  const tampered = new TextEncoder().encode("Atrocity");

  assert.equal(
    crypto.verify("Ed25519", key.publicKey, tampered, signature),
    false,
  );
});
