import assert from "node:assert/strict";
import test from "node:test";
import { ConnectionManager } from "../src/connection/index.js";

function deps(order: string[]) {
  return {
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
      start: async () => order.push("protocol.start"),
      stop: async () => order.push("protocol.stop"),
    },
    sync: {
      run: async () => order.push("sync"),
    },
    delay: async () => {},
  };
}

test("connection manager follows complete lifecycle", async () => {
  const order: string[] = [];
  const manager = new ConnectionManager(deps(order));

  await manager.connect();

  assert.equal(manager.snapshot().state, "ready");
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
  const manager = new ConnectionManager(deps(order));

  await manager.connect();
  await manager.close();

  assert.equal(manager.snapshot().state, "closed");
  assert.deepEqual(order, [
    "transport.connect",
    "handshake",
    "authenticate",
    "protocol.start",
    "sync",
    "protocol.stop",
    "transport.close",
  ]);
});

test("failed authentication moves connection to failed", async () => {
  const order: string[] = [];
  const d = deps(order);

  d.authenticate.run = async () => {
    throw new Error("authentication failed");
  };

  const manager = new ConnectionManager(d);

  await assert.rejects(() => manager.connect());
  assert.equal(manager.snapshot().state, "failed");
  assert.equal(manager.snapshot().lastFailure?.reason, "authentication");
});

test("connect calls are coalesced", async () => {
  const order: string[] = [];
  let resolveTransport: (() => void) | undefined;

  const d = deps(order);
  d.transport.connect = async () => {
    await new Promise<void>((resolve) => {
      resolveTransport = resolve;
    });
    order.push("transport.connect");
  };

  const manager = new ConnectionManager(d);

  const first = manager.connect();
  const second = manager.connect();

  resolveTransport!();
  await Promise.all([first, second]);

  assert.equal(
    order.filter((x) => x === "transport.connect").length,
    1,
  );
});
