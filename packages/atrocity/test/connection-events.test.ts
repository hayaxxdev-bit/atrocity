import assert from "node:assert/strict";
import test from "node:test";
import {
  ConnectionManager,
  InMemoryConnectionEventBus,
} from "../src/connection/index.js";

function deps() {
  return {
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
    sync: { run: async () => {} },
    delay: async () => {},
  };
}

test("connection emits ordered lifecycle events", async () => {
  const bus = new InMemoryConnectionEventBus();
  const events: string[] = [];

  bus.subscribe((event) => {
    events.push(event.type);
  });

  const actual = new ConnectionManager({
    ...deps(),
    events: bus,
    connectionId: "test-connection",
  });

  await actual.connect();

  assert.deepEqual(events, [
    "connection.created",
    "connection.connecting",
    "connection.socket-open",
    "connection.noise-handshake",
    "connection.authenticating",
    "connection.encrypted",
    "connection.syncing",
    "connection.ready",
  ]);
});

test("event sequence is monotonic", async () => {
  const bus = new InMemoryConnectionEventBus();
  const seen: number[] = [];

  bus.subscribe((event) => {
    seen.push(event.sequence);
  });

  const manager = new ConnectionManager({
    ...deps(),
    events: bus,
  });

  await manager.connect();
  await manager.close();

  assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
  assert.equal(new Set(seen).size, seen.length);
});

test("failed lifecycle event includes failure metadata", async () => {
  const bus = new InMemoryConnectionEventBus();
  const failures: any[] = [];

  bus.subscribe((event) => {
    if (event.type === "connection.failed") {
      failures.push(event.failure);
    }
  });

  const d = deps();
  d.authenticate.run = async () => {
    const error = new Error("authentication failed");
    error.name = "AuthenticationError";
    throw error;
  };

  const manager = new ConnectionManager({
    ...d,
    events: bus,
  });

  await assert.rejects(() => manager.connect());

  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, "authentication");
});

test("slow listener does not reorder events", async () => {
  const bus = new InMemoryConnectionEventBus();
  const seen: string[] = [];

  bus.subscribe(async (event) => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    seen.push(event.type);
  });

  await Promise.all([
    bus.publish({
      sequence: 1,
      timestamp: Date.now(),
      connectionId: "x",
      attempt: 0,
      type: "connection.created",
      previousState: "none",
      currentState: "created",
    }),
    bus.publish({
      sequence: 2,
      timestamp: Date.now(),
      connectionId: "x",
      attempt: 0,
      type: "connection.connecting",
      previousState: "created",
      currentState: "connecting",
    }),
  ]);

  assert.deepEqual(seen, [
    "connection.created",
    "connection.connecting",
  ]);
});
