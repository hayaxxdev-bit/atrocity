import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { NodeCryptoProvider, XEd25519Signer } from "../src/crypto/index.js";
import { generateSignalIdentity } from "../src/signal/index.js";

test("one Curve25519 identity works for X25519 and XEd25519", () => {
  const crypto = new NodeCryptoProvider();
  const identity = generateSignalIdentity(crypto);

  const signer = new XEd25519Signer(
    (length) => new Uint8Array(randomBytes(length)),
    (data) => new Uint8Array(createHash("sha512").update(data).digest()),
  );

  const message = new TextEncoder().encode("signed-pre-key");
  const signature = signer.sign(identity.privateKey, message);

  assert.equal(identity.publicKey.byteLength, 32);
  assert.equal(
    signer.verify(identity.publicKey, message, signature),
    true,
  );
});
