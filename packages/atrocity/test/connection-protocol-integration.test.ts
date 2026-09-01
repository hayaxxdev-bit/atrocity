import assert from "node:assert/strict";
import test from "node:test";
import {
  ConnectionManager,
  ConnectionProtocolAdapter,
} from "../src/connection/index.js";

test("connection manager starts protocol only after auth", async () => {
  const order: string[] = [];

  const adapter = new ConnectionProtocolAdapter({
    protocol: {
      start: async () => order.push("protocol.start"),
      stop: async () => order.push("protocol.stop"),
    },
  });

  const manager = new ConnectionManager({
    transport: {
      state: "idle",
      connect: async () => order.push("transport.connect"),
      close: async () => order.push("transport.close"),
    },
    handshake: {
      run: async () => order.push("handshake"),
    },
    authenticate: {
      run: async () => order.push("authenticate"),
    },
    protocol: {
      start: async () => order.push("legacy.start"),
      stop: async () => order.push("legacy.stop"),
    },
    protocolLifecycle: adapter,
    sync: {
      run: async () => order.push("sync"),
    },
    delay: async () => {},
  });

  await manager.connect();

  assert.deepEqual(order, [
    "transport.connect",
    "handshake",
    "authenticate",
    "protocol.start",
    "sync",
  ]);
});

test("connection close stops protocol before transport", async () => {
  const order: string[] = [];

  const adapter = new ConnectionProtocolAdapter({
    protocol: {
      start: async () => order.push("protocol.start"),
      stop: async () => order.push("protocol.stop"),
    },
  });

  const manager = new ConnectionManager({
    transport: {
      state: "idle",
      connect: async () => order.push("transport.connect"),
      close: async () => order.push("transport.close"),
    },
    handshake: {
      run: async () => order.push("handshake"),
    },
    authenticate: {
      run: async () => order.push("authenticate"),
    },
    protocol: {
      start: async () => order.push("legacy.start"),
      stop: async () => order.push("legacy.stop"),
    },
    protocolLifecycle: adapter,
    sync: {
      run: async () => {},
    },
    delay: async () => {},
  });

  await manager.connect();
  await manager.close();

  assert.deepEqual(order.slice(-3), [
    "protocol.start",
    "protocol.stop",
    "transport.close",
  ]);
});

test("protocol startup failure propagates to connection failure", async () => {
  const adapter = new ConnectionProtocolAdapter({
    protocol: {
      start: async () => {
        throw new Error("protocol start failed");
      },
      stop: async () => {},
    },
  });

  const manager = new ConnectionManager({
    transport: {
      state: "idle",
      connect: async () => {},
      close: async () => {},
    },
    handshake: { run: async () => {} },
    authenticate: { run: async () => {} },
    protocol: {
      start: async () => {},
      stop: async () => {},
    },
    protocolLifecycle: adapter,
    sync: { run: async () => {} },
    delay: async () => {},
  });

  await assert.rejects(() => manager.connect());
  assert.equal(manager.snapshot().state, "failed");
});
