import assert from "node:assert/strict";
import test from "node:test";
import {
  FeatureDiscovery,
  SyncBootstrap,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("feature discovery extracts child tags and namespaces", () => {
  const discovery = new FeatureDiscovery();

  const result = discovery.discover(
    protocolNode(
      "stream:features",
      {},
      protocolNode("auth", { xmlns: "urn:test:auth" }),
      protocolNode("sync", { xmlns: "urn:test:sync" }),
      protocolNode("auth", { xmlns: "urn:test:auth" }),
    ),
  );

  assert.deepEqual(
    result.tags,
    ["auth", "sync"],
  );
  assert.deepEqual(
    result.namespaces,
    ["urn:test:auth", "urn:test:sync"],
  );
});

test("sync bootstrap follows its lifecycle", async () => {
  const sent: any[] = [];
  const responses = [
    protocolNode("stream:features", {}, protocolNode("auth", { xmlns: "x" })),
    protocolNode("iq", { id: "bootstrap", type: "result" }),
  ];

  const bootstrap = new SyncBootstrap({
    sendNode: async (node) => sent.push(node),
    waitForNode: async () => {
      const node = responses.shift();
      if (!node) throw new Error("missing test response");
      return node;
    },
  }, {
    buildBootstrapNode: () =>
      protocolNode("iq", {
        id: "bootstrap",
        type: "get",
      }),
    initialNodePredicate: (node) =>
      node.tag === "iq" && node.attrs.type === "result",
  });

  const result = await bootstrap.run();

  assert.equal(bootstrap.stage, "completed");
  assert.equal(sent.length, 1);
  assert.equal(result.features.tags[0], "auth");
  assert.equal(result.initialNodes.length, 1);
});

test("invalid feature node fails deterministically", async () => {
  const bootstrap = new SyncBootstrap({
    sendNode: async () => {},
    waitForNode: async () =>
      protocolNode("iq", { type: "result" }),
  }, {
    buildBootstrapNode: () =>
      protocolNode("iq", { type: "get" }),
    initialNodePredicate: () => true,
  });

  await assert.rejects(() => bootstrap.run());
  assert.equal(bootstrap.stage, "failed");
});
