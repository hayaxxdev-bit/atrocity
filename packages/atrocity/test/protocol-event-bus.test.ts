import assert from "node:assert/strict";
import test from "node:test";
import {
  ProtocolEventBus,
  ProtocolRuntime,
  protocolNode,
} from "../src/protocol/index.js";

test("protocol event bus is typed and ordered", async () => {
  const bus = new ProtocolEventBus();
  const seen: string[] = [];

  bus.on("message.received", async (event) => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    seen.push(event.message.key.id);
  });

  await Promise.all([
    bus.emit("message.received", {
      type: "message.received",
      message: {
        key: {
          id: "1",
          remoteJid: "123@s.whatsapp.net",
        },
        fromMe: false,
        direction: "inbound",
        kind: "text",
        text: "a",
        raw: protocolNode("message", { id: "1" }),
      },
    }),
    bus.emit("message.received", {
      type: "message.received",
      message: {
        key: {
          id: "2",
          remoteJid: "123@s.whatsapp.net",
        },
        fromMe: false,
        direction: "inbound",
        kind: "text",
        text: "b",
        raw: protocolNode("message", { id: "2" }),
      },
    }),
  ]);

  assert.deepEqual(seen, ["1", "2"]);
});

test("once listener runs once", async () => {
  const bus = new ProtocolEventBus();
  let count = 0;

  bus.once("protocol.node", () => {
    count += 1;
  });

  const node = protocolNode("message", { id: "1" });

  await bus.emit("protocol.node", {
    node,
    receivedAt: 1,
  });
  await bus.emit("protocol.node", {
    node,
    receivedAt: 2,
  });

  assert.equal(count, 1);
});

test("runtime exposes canonical protocol events", async () => {
  const runtime = new ProtocolRuntime({
    sendNode: async () => {},
  });

  let seen = false;
  runtime.events.on("protocol.node", () => {
    seen = true;
  });

  runtime.registerFeature({
    name: "noop",
    version: 1,
    start: async () => {},
    stop: async () => {},
  });

  await runtime.start();
  await runtime.receiveNode(
    protocolNode("message", { id: "x" }),
  );

  assert.equal(seen, true);
});
