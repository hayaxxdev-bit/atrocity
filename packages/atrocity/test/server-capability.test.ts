import assert from "node:assert/strict";
import test from "node:test";
import {
  ServerCapabilityMap,
  ProtocolFeatureManager,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("capability map derives supported capabilities", () => {
  const mapper = new ServerCapabilityMap();
  const capabilities = mapper.fromNode(
    protocolNode(
      "stream:features",
      {},
      protocolNode("message", { xmlns: "urn:xmpp:message" }),
      protocolNode("presence", { xmlns: "urn:xmpp:presence" }),
    ),
  );

  assert.equal(capabilities.messaging.supported, true);
  assert.equal(capabilities.presence.supported, true);
  assert.equal(capabilities.groups.supported, false);
});

test("feature manager enforces server capability requirements", async () => {
  const manager = new ProtocolFeatureManager();
  let started = false;

  manager.register({
    name: "groups",
    version: 1,
    requiredServerCapabilities: ["groups"],
    start: async () => {
      started = true;
    },
    stop: async () => {},
  });

  const mapper = new ServerCapabilityMap();
  const capabilities = mapper.fromFeatureSet({
    namespaces: [],
    tags: [],
  });

  await assert.rejects(() =>
    manager.startAll(capabilities),
  );

  assert.equal(started, false);
});

test("feature manager starts when capability is available", async () => {
  const manager = new ProtocolFeatureManager();
  let started = false;

  manager.register({
    name: "presence",
    version: 1,
    requiredServerCapabilities: ["presence"],
    start: async () => {
      started = true;
    },
    stop: async () => {},
  });

  const mapper = new ServerCapabilityMap();
  const capabilities = mapper.fromFeatureSet({
    namespaces: ["urn:xmpp:presence"],
    tags: [],
  });

  await manager.startAll(capabilities);
  assert.equal(started, true);
});
