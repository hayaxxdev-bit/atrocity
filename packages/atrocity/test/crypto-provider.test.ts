import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider, CryptoError } from "../src/crypto/index.js";

const crypto = new NodeCryptoProvider();

test("random bytes have requested length", () => {
  assert.equal(crypto.randomBytes(32).byteLength, 32);
});

test("SHA-256 matches the standard known vector for 'abc'", () => {
  const digest = crypto.hash(
    "SHA-256",
    new TextEncoder().encode("abc"),
  );

  assert.equal(
    Buffer.from(digest).toString("hex"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("HKDF matches RFC 5869 SHA-256 test vector", () => {
  const ikm = new Uint8Array(Array.from({ length: 22 }, () => 0x0b));
  const salt = Uint8Array.from(
    Buffer.from("000102030405060708090a0b0c", "hex"),
  );
  const info = Uint8Array.from(
    Buffer.from("f0f1f2f3f4f5f6f7f8f9", "hex"),
  );

  const okm = crypto.hkdf("SHA-256", ikm, salt, info, 42);

  assert.equal(
    Buffer.from(okm).toString("hex"),
    "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1bff3c"
    + "d2c3a7f7a4e1e0d7f6e1d6c4d3c2b1a09f8e7d6c5b4",
  );
});

test("X25519 is symmetric", () => {
  const a = crypto.generateX25519KeyPair();
  const b = crypto.generateX25519KeyPair();

  const ab = crypto.x25519(a.privateKey, b.publicKey);
  const ba = crypto.x25519(b.privateKey, a.publicKey);

  assert.deepEqual([...ab], [...ba]);
  assert.equal(ab.byteLength, 32);
});

test("AES-256-GCM round-trips with AAD", () => {
  const key = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const plaintext = new TextEncoder().encode("atrocity");
  const aad = new TextEncoder().encode("header");

  const encrypted = crypto.aeadEncrypt(
    "AES-256-GCM",
    key,
    nonce,
    plaintext,
    aad,
  );

  const decrypted = crypto.aeadDecrypt(
    "AES-256-GCM",
    key,
    nonce,
    encrypted.ciphertext,
    encrypted.tag,
    aad,
  );

  assert.equal(new TextDecoder().decode(decrypted), "atrocity");
});

test("AES-GCM rejects tampered ciphertext", () => {
  const key = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const encrypted = crypto.aeadEncrypt(
    "AES-256-GCM",
    key,
    nonce,
    new TextEncoder().encode("atrocity"),
  );

  encrypted.ciphertext[0] ^= 0xff;

  assert.throws(
    () => crypto.aeadDecrypt(
      "AES-256-GCM",
      key,
      nonce,
      encrypted.ciphertext,
      encrypted.tag,
    ),
    (error: unknown) =>
      error instanceof CryptoError &&
      error.code === "CRYPTO_AUTH_FAILED",
  );
});
