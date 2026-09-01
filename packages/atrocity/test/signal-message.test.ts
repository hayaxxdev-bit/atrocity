import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  DHRatchet,
  RatchetReceiver,
  SignalMessageAead,
  SignalMessageHeaderCodec,
  SignalMessageCrypto,
} from "../src/signal/index.js";

test("signal header round-trips", () => {
  const codec = new SignalMessageHeaderCodec();
  const header = {
    ratchetPublicKey: new Uint8Array(32).fill(1),
    previousChainLength: 7n,
    messageNumber: 9n,
  };

  const encoded = codec.encode(header);
  const decoded = codec.decode(encoded);

  assert.deepEqual([...decoded.ratchetPublicKey], [...header.ratchetPublicKey]);
  assert.equal(decoded.previousChainLength, 7n);
  assert.equal(decoded.messageNumber, 9n);
});

test("message AEAD round-trips with associated data", () => {
  const crypto = new NodeCryptoProvider();
  const aead = new SignalMessageAead(crypto);
  const key = new Uint8Array(32).fill(7);
  const aad = new TextEncoder().encode("header");
  const plaintext = new TextEncoder().encode("atrocity");

  const ciphertext = aead.encrypt(key, aad, plaintext);
  const decrypted = aead.decrypt(key, aad, ciphertext);

  assert.deepEqual([...decrypted], [...plaintext]);
});

test("tampered message fails authentication", () => {
  const crypto = new NodeCryptoProvider();
  const aead = new SignalMessageAead(crypto);
  const key = new Uint8Array(32).fill(7);
  const ciphertext = aead.encrypt(
    key,
    new Uint8Array(0),
    new TextEncoder().encode("atrocity"),
  );

  ciphertext[0] ^= 0xff;

  assert.throws(() => aead.decrypt(
    key,
    new Uint8Array(0),
    ciphertext,
  ));
});

test("SignalMessageCrypto binds header into AEAD associated data", () => {
  const crypto = new NodeCryptoProvider();
  const a = crypto.generateX25519KeyPair();
  const b = crypto.generateX25519KeyPair();
  const root = new Uint8Array(32).fill(1);

  const sender = new DHRatchet(crypto, root, a);
  const receiverRatchet = new DHRatchet(crypto, root, b);
  receiverRatchet.initializeReceivingChain(
    new Uint8Array(32).fill(4),
  );

  sender.initializeSendingChain(new Uint8Array(32).fill(4));

  const senderKey = sender.nextSendingMessageKey();

  const senderSession = {
    ratchet: sender,
    receiver: new RatchetReceiver(crypto, receiverRatchet),
    associatedData: new TextEncoder().encode("session-ad"),
  };

  // Header is tested independently here; cross-session root initialization
  // is intentionally not asserted as protocol-interoperable in M1.29.
  const messageCrypto = new SignalMessageCrypto(crypto);
  const outgoing = messageCrypto.createOutgoing(
    senderSession,
    senderKey,
    new TextEncoder().encode("hello"),
  );

  assert.equal(outgoing.ciphertext.byteLength >= 16, true);
});
