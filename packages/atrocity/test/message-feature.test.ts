import assert from "node:assert/strict";
import test from "node:test";
import {
  MessageFeature,
  MessageNormalizer,
  ProtocolRegistry,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("message normalizer creates a domain envelope", () => {
  const normalizer = new MessageNormalizer();
  const node = protocolNode(
    "message",
    { id: "m-1", from: "123@s.whatsapp.net", notify: "Hayaxx", t: "42" },
    protocolNode("body", {}, "hello"),
  );
  const message = normalizer.normalize(node);
  assert.equal(message.key.id, "m-1");
  assert.equal(message.key.remoteJid, "123@s.whatsapp.net");
  assert.equal(message.direction, "inbound");
  assert.equal(message.kind, "text");
  assert.equal(message.text, "hello");
  assert.equal(message.timestamp, 42);
});

test("message feature owns its inbound route lifecycle", async () => {
  const registry = new ProtocolRegistry();
  const feature = new MessageFeature(registry);
  const events: any[] = [];
  feature.onEvent((event) => events.push(event));

  const runtime = feature.createProtocolFeature();
  await runtime.start({ featureName: "message" });

  await registry.dispatch(
    protocolNode(
      "message",
      { id: "m-2", from: "123@s.whatsapp.net" },
      protocolNode("body", {}, "hello"),
    ),
    { receivedAt: 1 },
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "message.received");

  await runtime.stop({ featureName: "message" });

  const result = await registry.dispatch(
    protocolNode("message", { id: "m-3", from: "123@s.whatsapp.net" }),
    { receivedAt: 2 },
  );
  assert.equal(result.handled, false);
});

test("invalid message nodes fail explicitly", () => {
  const normalizer = new MessageNormalizer();
  assert.throws(() => normalizer.normalize(protocolNode("iq", { id: "x" })));
});
