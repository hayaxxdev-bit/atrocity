import assert from "node:assert/strict";
import test from "node:test";
import { WhatsAppServerHelloProcessor } from "../src/protocol/index.js";

function makeProcessor(order: string[]) {
  return new WhatsAppServerHelloProcessor({
    clientEphemeralPrivateKey: new Uint8Array(32).fill(1),
    noiseKeyPair: {
      privateKey: new Uint8Array(32).fill(2),
      publicKey: new Uint8Array(32).fill(3),
    },
    sharedKey: () => {
      order.push("dh");
      return new Uint8Array(32).fill(4);
    },
    authenticate: () => order.push("authenticate"),
    mixIntoKey: () => order.push("mix"),
    decrypt: () => {
      order.push("decrypt");
      return new Uint8Array(32).fill(5);
    },
    encrypt: () => {
      order.push("encrypt");
      return new Uint8Array(32).fill(6);
    },
    decodeCertificateChain: () => {
      order.push("decode-cert");
      return {
        intermediate: {
          details: new Uint8Array([1]),
          signature: new Uint8Array([2]),
        },
        leaf: {
          details: new Uint8Array([3]),
          signature: new Uint8Array([4]),
        },
      };
    },
    decodeIntermediateDetails: () => {
      order.push("decode-details");
      return {
        key: new Uint8Array(32).fill(7),
        issuerSerial: 0,
      };
    },
    verifySignature: () => {
      order.push("verify");
      return true;
    },
    certificateAuthorityPublicKey: new Uint8Array(32).fill(8),
    certificateAuthoritySerial: 0,
  });
}

test("ServerHello processing preserves reference operation order", () => {
  const order: string[] = [];
  const processor = makeProcessor(order);

  const result = processor.process({
    ephemeral: new Uint8Array(32).fill(9),
    static: new Uint8Array(32).fill(10),
    payload: new Uint8Array(32).fill(11),
  });

  assert.equal(result.encryptedStatic.length, 32);
  assert.deepEqual(order, [
    "authenticate",
    "dh",
    "mix",
    "decrypt",
    "dh",
    "mix",
    "decrypt",
    "decode-cert",
    "decode-details",
    "verify",
    "verify",
    "encrypt",
    "dh",
    "mix",
  ]);
});

test("malformed ServerHello fails closed", () => {
  const processor = makeProcessor([]);
  assert.throws(() =>
    processor.process({
      ephemeral: new Uint8Array(31),
      static: new Uint8Array(32),
      payload: new Uint8Array(32),
    }),
  );
});
