import assert from "node:assert/strict";
import test from "node:test";
import { WAMessageCodec, normalizeWAMessage } from "../src/protocol/protobuf/index.js";

const codec = new WAMessageCodec({
  encode: (message) => new TextEncoder().encode(JSON.stringify(message)),
  decode: (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
});

test("WAMessage normalizer requires remoteJid and id", () => {
  const value = normalizeWAMessage({
    key: { remoteJid: "123@s.whatsapp.net", id: "ABC" },
    message: { conversation: "hello" },
  });
  assert.equal(value.key?.remoteJid, "123@s.whatsapp.net");
  assert.equal(value.key?.id, "ABC");
  assert.equal(value.key?.fromMe, true);
});

test("codec boundary round-trips with test double", () => {
  const value = { key: { remoteJid: "123@s.whatsapp.net", id: "ABC" }, message: { conversation: "hello" } };
  const decoded = codec.roundTrip(value);
  assert.equal(decoded.message?.conversation, "hello");
});

test("extended text context is retained", () => {
  const value = normalizeWAMessage({
    key: { remoteJid: "123@s.whatsapp.net", id: "ABC" },
    message: {
      extendedTextMessage: {
        text: "hello",
        contextInfo: { mentionedJid: ["1@s.whatsapp.net"], stanzaId: "q1" },
      },
    },
  });
  assert.deepEqual(value.message?.extendedTextMessage?.contextInfo?.mentionedJid, ["1@s.whatsapp.net"]);
});
