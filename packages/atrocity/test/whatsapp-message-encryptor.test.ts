import assert from "node:assert/strict";
import test from "node:test";
import {
  WhatsAppMessageEncryptor,
  WhatsAppMessageEnvelopeBuilder,
} from "../src/signal/message/index.js";

test("Signal result is preserved as msg/pkmsg", async () => {
  const encryptor = new WhatsAppMessageEncryptor(
    {
      encryptMessage: async (jid, data) => {
        assert.equal(jid, "123@s.whatsapp.net");
        assert.equal(data.length, 2);
        return {
          type: "pkmsg",
          ciphertext: new Uint8Array([1, 2, 3]),
        };
      },
    },
    new WhatsAppMessageEnvelopeBuilder(),
  );

  const result = await encryptor.encrypt(
    "123@s.whatsapp.net",
    new Uint8Array([9, 8]),
  );

  assert.equal(result.signalType, "pkmsg");
  assert.deepEqual([...result.ciphertext], [1, 2, 3]);
});

test("WhatsApp envelope wraps Signal ciphertext separately", async () => {
  const encryptor = new WhatsAppMessageEncryptor(
    {
      encryptMessage: async () => ({
        type: "msg",
        ciphertext: new Uint8Array([4, 5]),
      }),
    },
    new WhatsAppMessageEnvelopeBuilder(),
  );

  const node = await encryptor.buildEnvelope(
    "123@s.whatsapp.net",
    new Uint8Array([1]),
  );

  assert.equal(node.tag, "to");
  assert.equal(node.attrs.jid, "123@s.whatsapp.net");
  assert.equal(node.content?.kind, "nodes");
  assert.equal(node.content?.kind === "nodes" ? node.content.value[0]?.tag : "", "enc");
  assert.equal(
    node.content?.kind === "nodes"
      ? node.content.value[0]?.attrs.type
      : undefined,
    "msg",
  );
});

test("invalid recipient and empty plaintext are rejected", async () => {
  const encryptor = new WhatsAppMessageEncryptor(
    { encryptMessage: async () => ({ type: "msg", ciphertext: new Uint8Array([1]) }) },
    new WhatsAppMessageEnvelopeBuilder(),
  );

  await assert.rejects(() => encryptor.encrypt("bad", new Uint8Array([1])));
  await assert.rejects(() => encryptor.encrypt("123@s.whatsapp.net", new Uint8Array()));
});

test("envelope clones ciphertext", () => {
  const builder = new WhatsAppMessageEnvelopeBuilder();
  const ciphertext = new Uint8Array([7, 8]);

  const node = builder.build(
    "123@s.whatsapp.net",
    { type: "msg", ciphertext },
  );

  ciphertext[0] = 99;

  const enc = node.content?.kind === "nodes" ? node.content.value[0] : undefined;
  assert.equal(
    enc?.content?.kind === "binary" ? enc.content.value[0] : -1,
    7,
  );
});
