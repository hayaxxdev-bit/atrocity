import assert from "node:assert/strict";
import test from "node:test";
import {
  ProtocolRuntime,
  protocolNode,
} from "../src/protocol/index.js";

test("protocol runtime starts features and dispatches inbound nodes", async () => {
  const sent: any[] = [];
  const runtime = new ProtocolRuntime({
    sendNode: async (node) => {
      sent.push(node);
    },
    connectionId: "runtime-test",
  });

  const order: string[] = [];

  runtime.registerFeature({
    name: "iq",
    version: 1,
    start: async () => order.push("start"),
    stop: async () => order.push("stop"),
  });

  runtime.registerRoute({
    name: "message",
    tag: "message",
    handler: async () => {
      order.push("message");
    },
  });

  await runtime.start();
  assert.equal(runtime.state, "started");

  await runtime.sendNode(
    protocolNode("message", { id: "1" }),
  );

  await runtime.receiveNode(
    protocolNode("message", { id: "1" }),
  );

  assert.deepEqual(order, ["start", "message"]);
  assert.equal(sent.length, 1);
});

test("runtime stop closes IQ and features", async () => {
  const runtime = new ProtocolRuntime({
    sendNode: async () => {},
  });

  let stopped = false;

  runtime.registerFeature({
    name: "x",
    version: 1,
    start: async () => {},
    stop: async () => {
      stopped = true;
    },
  });

  await runtime.start();
  await runtime.stop();

  assert.equal(stopped, true);
  assert.equal(runtime.state, "stopped");
  assert.equal(runtime.snapshot().startedFeatures.length, 0);
});

test("runtime rejects operations outside started state", async () => {
  const runtime = new ProtocolRuntime({
    sendNode: async () => {},
  });

  await assert.rejects(() =>
    runtime.sendNode(protocolNode("message", {})),
  );

  await assert.rejects(() =>
    runtime.receiveNode(protocolNode("message", {})),
  );
});
