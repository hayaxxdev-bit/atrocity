import assert from "node:assert/strict";
import test from "node:test";
import {
  InboundMessageDecryptor,
  handleInboundEncryptedMessage,
} from "../src/protocol/features/message/index.js";
import { protocolNode } from "../src/protocol/index.js";

function encrypted(type: "msg" | "pkmsg") {
  return protocolNode(
    "to",
    { jid: "123@s.whatsapp.net" },
    {
      kind: "nodes",
      value: [
        protocolNode(
          "enc",
          { v: "2", type },
          {
            kind: "binary",
            value: new Uint8Array([1,2,3]),
          },
        ),
      ],
    },
  );
}

test("extracts msg ciphertext from to/enc", () => {
  const decryptor = new InboundMessageDecryptor(
    { decryptMessage: async () => new Uint8Array([9]) },
    { ensureSession: async () => {}, commit: async () => {} },
  );

  const result = decryptor.extract(encrypted("msg"));

  assert.equal(result.remoteJid, "123@s.whatsapp.net");
  assert.equal(result.type, "msg");
  assert.deepEqual([...result.ciphertext], [1,2,3]);
});

test("pkmsg establishes/ensures session before decrypt", async () => {
  const order: string[] = [];

  const decryptor = new InboundMessageDecryptor(
    {
      decryptMessage: async () => {
        order.push("decrypt");
        return new Uint8Array([1]);
      },
    },
    {
      ensureSession: async () => order.push("ensure-session"),
      commit: async () => order.push("commit"),
    },
  );

  await decryptor.decrypt(encrypted("pkmsg"));

  assert.deepEqual(order, [
    "ensure-session",
    "decrypt",
    "commit",
  ]);
});

test("msg commits ratchet state after decrypt", async () => {
  const order: string[] = [];

  const decryptor = new InboundMessageDecryptor(
    {
      decryptMessage: async () => {
        order.push("decrypt");
        return new Uint8Array([1]);
      },
    },
    {
      ensureSession: async () => {
        order.push("unexpected");
      },
      commit: async () => order.push("commit"),
    },
  );

  await decryptor.decrypt(encrypted("msg"));

  assert.deepEqual(order, ["decrypt", "commit"]);
});

test("publish occurs only after decrypt and plaintext decode", async () => {
  const order: string[] = [];

  const decryptor = new InboundMessageDecryptor(
    {
      decryptMessage: async () => {
        order.push("decrypt");
        return new Uint8Array([123]);
      },
    },
    {
      ensureSession: async () => {},
      commit: async () => order.push("commit"),
    },
  );

  let published = false;

  await handleInboundEncryptedMessage(
    encrypted("msg"),
    {
      decryptor,
      codec: {
        encode: () => new Uint8Array(),
        decode: () => {
          order.push("decode");
          return {
            key: { remoteJid: "123@s.whatsapp.net", id: "m1" },
          };
        },
      },
      publish: async () => {
        order.push("publish");
        published = true;
      },
    },
  );

  assert.equal(published, true);
  assert.deepEqual(order, [
    "decrypt",
    "commit",
    "decode",
    "publish",
  ]);
});

test("malformed encryption node is rejected", () => {
  const decryptor = new InboundMessageDecryptor(
    { decryptMessage: async () => new Uint8Array([1]) },
    { ensureSession: async () => {}, commit: async () => {} },
  );

  assert.throws(() =>
    decryptor.extract(protocolNode("to", { jid: "123@s.whatsapp.net" })),
  );
});
