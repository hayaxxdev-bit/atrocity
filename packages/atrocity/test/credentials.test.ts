import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  CredentialGenerator,
  createRegistrationBundle,
  registrationBundleToPayload,
} from "../src/auth/index.js";

test("generates durable-shaped device credentials", () => {
  const crypto = new NodeCryptoProvider();
  const generator = new CredentialGenerator(crypto);
  const credentials = generator.generate();

  assert.equal(credentials.device.identityKeyPublic.byteLength, 32);
  assert.equal(credentials.device.identityKeyPrivate.byteLength, 32);
  assert.equal(credentials.signedPreKey.publicKey.byteLength, 32);
  assert.equal(credentials.registrationId >= 0, true);
});

test("registration bundle maps into DevicePairingData shape", () => {
  const crypto = new NodeCryptoProvider();
  const identity = crypto.generateX25519KeyPair();
  const signed = crypto.generateX25519KeyPair();

  const bundle = createRegistrationBundle({
    registrationId: 123,
    signedPreKey: signed,
    signedPreKeyId: 456,
    signedPreKeySignature: new Uint8Array([9, 8, 7]),
    identityPublicKey: identity.publicKey,
    buildHash: new Uint8Array([1, 2]),
    deviceProps: new Uint8Array([3, 4]),
  });

  const payload = registrationBundleToPayload(bundle);

  assert.equal(payload.devicePairingData.eRegid.length, 4);
  assert.deepEqual([...payload.devicePairingData.eIdent], [...identity.publicKey]);
  assert.deepEqual([...payload.devicePairingData.eSkeyVal], [...signed.publicKey]);
});
