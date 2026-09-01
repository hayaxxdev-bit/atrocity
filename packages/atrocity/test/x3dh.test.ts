import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  MemoryPreKeyStore,
  PreKeyGenerator,
  X3DH,
} from "../src/signal/index.js";

test("X3DH initiator and responder derive the same secret with OPK", () => {
  const crypto = new NodeCryptoProvider();
  const generator = new PreKeyGenerator(crypto);

  const bobIdentity = crypto.generateX25519KeyPair();
  const bobSigning = crypto.generateEd25519KeyPair();
  const bobSignedPreKey = crypto.generateX25519KeyPair();
  const bobOpk = crypto.generateX25519KeyPair();

  const signature = crypto.sign(
    "Ed25519",
    bobSigning.privateKey,
    bobSignedPreKey.publicKey,
  );

  const bundle = {
    registrationId: 42,
    identityKey: bobIdentity.publicKey,
    signedPreKeyId: 7,
    signedPreKey: bobSignedPreKey.publicKey,
    signedPreKeySignature: signature,
    oneTimePreKeyId: 100,
    oneTimePreKey: bobOpk.publicKey,
  };

  const aliceIdentity = crypto.generateX25519KeyPair();
  const x3dh = new X3DH(crypto, {
    info: new TextEncoder().encode("Atrocity-X3DH-test"),
    verifySignedPreKey: (identityKey, signedPreKey, signedSignature) =>
      crypto.verify(
        "Ed25519",
        bobSigning.publicKey,
        signedPreKey,
        signedSignature,
      ) && identityKey.every((byte, index) => byte === bobIdentity.publicKey[index]),
  });

  const initial = x3dh.createInitialMessage(bundle, aliceIdentity);
  const responderSecret = x3dh.deriveResponderSecret(initial, {
    identityKey: bobIdentity.publicKey,
    signedPreKeyId: 7,
    signedPreKeyPrivate: bobSignedPreKey.privateKey,
    oneTimePreKeyId: 100,
    oneTimePreKeyPrivate: bobOpk.privateKey,
  });

  assert.deepEqual([...initial.sharedSecret], [...responderSecret]);
});

test("X3DH aborts before OPK deletion when signature verification fails", () => {
  const crypto = new NodeCryptoProvider();
  const generator = new PreKeyGenerator(crypto);
  const store = new MemoryPreKeyStore();

  generator.initializeStore(store, 1, {
    oneTimePreKeyCount: 1,
    oneTimePreKeyStart: 10,
  });

  const identity = store.getIdentityKey()!;
  const signed = store.getSignedPreKey()!;
  const opk = store.getOneTimePreKey(10)!;
  const x3dh = new X3DH(crypto, {
    info: new TextEncoder().encode("Atrocity-X3DH-test"),
    verifySignedPreKey: () => false,
  });

  assert.throws(() =>
    x3dh.createInitialMessage(
      {
        registrationId: 1,
        identityKey: identity.publicKey,
        signedPreKeyId: signed.keyId,
        signedPreKey: signed.keyPair.publicKey,
        signedPreKeySignature: signed.signature,
        oneTimePreKeyId: opk.keyId,
        oneTimePreKey: opk.keyPair.publicKey,
      },
      crypto.generateX25519KeyPair(),
    )
  );

  assert.deepEqual(store.listOneTimePreKeyIds(), [10]);
});
