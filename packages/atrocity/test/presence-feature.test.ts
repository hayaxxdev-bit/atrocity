import assert from "node:assert/strict";
import test from "node:test";
import {
  PresenceApi,
  PresenceFeature,
  PresenceNodeBuilder,
  PresenceNormalizer,
  ProtocolRegistry,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("presence normalizer maps available status", () => {
  const normalizer = new PresenceNormalizer();
  const presence = normalizer.normalize(
    protocolNode("presence", {
      from: "123@s.whatsapp.net",
      type: "available",
      t: "42",
    }),
  );

  assert.equal(presence.jid, "123@s.whatsapp.net");
  assert.equal(presence.status, "available");
  assert.equal(presence.timestamp, 42);
});

test("presence builder creates outbound node", () => {
  const builder = new PresenceNodeBuilder();
  const node = builder.build({
    jid: "123@s.whatsapp.net",
    status: "composing",
  });

  assert.equal(node.tag, "presence");
  assert.equal(node.attrs.to, "123@s.whatsapp.net");
  assert.equal(node.attrs.type, "composing");
});

test("presence API sends helpers", async () => {
  const sent: any[] = [];
  const api = new PresenceApi({
    sendNode: async (node) => sent.push(node),
  });

  await api.composing("123@s.whatsapp.net");
  await api.paused("123@s.whatsapp.net");

  assert.equal(sent.length, 2);
  assert.equal(sent[0].attrs.type, "composing");
  assert.equal(sent[1].attrs.type, "paused");
});

test("presence feature owns route lifecycle", async () => {
  const registry = new ProtocolRegistry();
  const events: any[] = [];
  const feature = new PresenceFeature(registry, {
    onEvent: (event) => events.push(event),
  });
  const lifecycle = feature.createProtocolFeature();

  await lifecycle.start({ featureName: "presence" });

  await registry.dispatch(
    protocolNode("presence", {
      from: "123@s.whatsapp.net",
      type: "recording",
    }),
    { receivedAt: 1 },
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].presence.status, "recording");

  await lifecycle.stop({ featureName: "presence" });

  const result = await registry.dispatch(
    protocolNode("presence", {
      from: "123@s.whatsapp.net",
      type: "paused",
    }),
    { receivedAt: 2 },
  );
  assert.equal(result.handled, false);
});
