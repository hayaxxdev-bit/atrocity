import assert from "node:assert/strict";
import test from "node:test";
import {
  ProtocolRegistry,
  ProtocolRouter,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("registry dispatches matching routes in priority order", async () => {
  const registry = new ProtocolRegistry();
  const seen: string[] = [];

  registry.register({
    name: "generic-iq",
    tag: "iq",
    priority: 1,
    handler: async () => {
      seen.push("generic");
    },
  });

  registry.register({
    name: "result-iq",
    tag: "iq",
    attributes: { type: "result" },
    priority: 10,
    handler: async () => {
      seen.push("result");
    },
  });

  const result = await registry.dispatch(
    protocolNode("iq", { type: "result" }),
    { receivedAt: 1 },
  );

  assert.deepEqual(seen, ["result", "generic"]);
  assert.deepEqual(result.routeNames, ["result-iq", "generic-iq"]);
});

test("routes can be unregistered", async () => {
  const registry = new ProtocolRegistry();
  const router = new ProtocolRouter(registry);
  const stop = router.register("message", async () => {});

  assert.equal(registry.list().length, 1);
  stop();
  assert.equal(registry.list().length, 0);
});

test("duplicate routes are rejected", () => {
  const registry = new ProtocolRegistry();
  registry.register({
    name: "x",
    handler: async () => {},
  });

  assert.throws(() =>
    registry.register({
      name: "x",
      handler: async () => {},
    })
  );
});

test("unmatched nodes report handled=false", async () => {
  const registry = new ProtocolRegistry();
  const result = await registry.dispatch(
    protocolNode("presence", {}),
    { receivedAt: 1 },
  );

  assert.equal(result.handled, false);
  assert.deepEqual(result.routeNames, []);
});
