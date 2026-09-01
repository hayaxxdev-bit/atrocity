import assert from "node:assert/strict";
import test from "node:test";
import {
  ProtocolFeatureManager,
  type ProtocolFeature,
} from "../src/protocol/index.js";

function feature(
  name: string,
  dependencies: readonly string[] = [],
  order: string[] = [],
  fail = false,
): ProtocolFeature {
  return {
    name,
    version: 1,
    dependencies,
    start: async () => {
      if (fail) throw new Error(`start ${name} failed`);
      order.push(`start:${name}`);
    },
    stop: async () => {
      order.push(`stop:${name}`);
    },
  };
}

test("feature manager starts dependencies before dependents", async () => {
  const order: string[] = [];
  const manager = new ProtocolFeatureManager();

  manager.register(feature("iq", [], order));
  manager.register(feature("message", ["iq"], order));
  manager.register(feature("receipt", ["message"], order));

  await manager.start("receipt");

  assert.deepEqual(order, [
    "start:iq",
    "start:message",
    "start:receipt",
  ]);
});

test("feature manager stops in reverse dependency order", async () => {
  const order: string[] = [];
  const manager = new ProtocolFeatureManager();

  manager.register(feature("iq", [], order));
  manager.register(feature("message", ["iq"], order));
  manager.register(feature("receipt", ["message"], order));

  await manager.startAll();
  await manager.stopAll();

  assert.deepEqual(order, [
    "start:iq",
    "start:message",
    "start:receipt",
    "stop:receipt",
    "stop:message",
    "stop:iq",
  ]);
});

test("failed start rolls back features that already started", async () => {
  const order: string[] = [];
  const manager = new ProtocolFeatureManager();

  manager.register(feature("iq", [], order));
  manager.register(feature("message", ["iq"], order, true));

  await assert.rejects(() => manager.startAll());

  assert.deepEqual(order, [
    "start:iq",
    "stop:iq",
  ]);
  assert.equal(manager.get("iq").state, "stopped");
  assert.equal(manager.get("message").state, "failed");
});

test("missing dependencies are rejected before start", async () => {
  const order: string[] = [];
  const manager = new ProtocolFeatureManager();

  manager.register(feature("message", ["iq"], order));

  await assert.rejects(() => manager.startAll());
  assert.deepEqual(order, []);
});

test("dependency cycles are rejected", async () => {
  const manager = new ProtocolFeatureManager();

  manager.register(feature("a", ["b"]));
  manager.register(feature("b", ["a"]));

  await assert.rejects(() => manager.startAll());
});

test("unregister returns a lifecycle-safe disposer", () => {
  const manager = new ProtocolFeatureManager();
  const dispose = manager.register(feature("iq"));

  assert.equal(manager.list().length, 1);
  assert.equal(manager.get("iq").state, "registered");

  dispose();

  assert.throws(() => manager.get("iq"));
});
