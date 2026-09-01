import assert from "node:assert/strict";
import test from "node:test";
import {
  MessageApi,
  MessageNodeBuilder,
} from "../src/protocol/index.js";

test("text message builder creates a protocol node", () => {
  const builder = new MessageNodeBuilder();

  const node = builder.buildText({
    id: "m-1",
    remoteJid: "123@s.whatsapp.net",
    text: "hello",
    fromMe: true,
  });

  assert.equal(node.tag, "message");
  assert.equal(node.attrs.id, "m-1");
  assert.equal(node.attrs.to, "123@s.whatsapp.net");
  assert.equal(node.attrs.from_me, "1");

  const body = node.content[0] as any;
  assert.equal(body.tag, "body");
  assert.equal(body.content[0], "hello");
});

test("message API generates an id when omitted", async () => {
  const sent: any[] = [];
  const api = new MessageApi({
    sendNode: async (node) => {
      sent.push(node);
    },
  });

  const result = await api.sendText(
    "123@s.whatsapp.net",
    "hello",
  );

  assert.equal(sent.length, 1);
  assert.equal(result.attrs.id, sent[0].attrs.id);
  assert.equal(result.attrs.id?.startsWith("msg-"), true);
});

test("message builder rejects empty body", () => {
  const builder = new MessageNodeBuilder();

  assert.throws(() =>
    builder.buildText({
      id: "m-1",
      remoteJid: "123@s.whatsapp.net",
      text: "",
    })
  );
});

test("message builder rejects oversized body", () => {
  const builder = new MessageNodeBuilder();

  assert.throws(() =>
    builder.buildText({
      id: "m-1",
      remoteJid: "123@s.whatsapp.net",
      text: "x".repeat(65_537),
    })
  );
});
