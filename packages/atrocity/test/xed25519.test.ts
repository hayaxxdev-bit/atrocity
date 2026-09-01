import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes } from "node:crypto";
import {
  NodeCryptoProvider,
  XEd25519Signer,
} from "../src/crypto/index.js";

test("XEd25519 round-trip over an X25519 key format", () => {
  const crypto = new NodeCryptoProvider();
  const key = crypto.generateX25519KeyPair();

  const signer = new XEd25519Signer(
    (length) => new Uint8Array(randomBytes(length)),
    (data) => new Uint8Array(createHash("sha512").update(data).digest()),
  );

  const message = new TextEncoder().encode("signed-pre-key");
  const signature = signer.sign(key.privateKey, message);

  assert.equal(signature.byteLength, 64);
  assert.equal(
    signer.verify(key.publicKey, message, signature),
    true,
  );
});

test("XEd25519 rejects tampering", () => {
  const crypto = new NodeCryptoProvider();
  const key = crypto.generateX25519KeyPair();

  const signer = new XEd25519Signer(
    (length) => new Uint8Array(randomBytes(length)),
    (data) => new Uint8Array(createHash("sha512").update(data).digest()),
  );

  const message = new TextEncoder().encode("signed-pre-key");
  const signature = signer.sign(key.privateKey, message);
  const tampered = new TextEncoder().encode("signed-pre-key!");

  assert.equal(
    signer.verify(key.publicKey, tampered, signature),
    false,
  );
});
