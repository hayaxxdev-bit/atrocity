import assert from "node:assert/strict";
import test from "node:test";
import {
  ConnectionDiagnostics,
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

test("health becomes healthy after a successful lifecycle", async () => {
  const bus = new InMemoryConnectionEventBus();
  const manager = new ConnectionManager({
    ...deps(),
    events: bus,
  });
  const diagnostics = new ConnectionDiagnostics(bus, manager);

  await manager.connect();

  const report = diagnostics.report();
  assert.equal(report.connection.state, "ready");
  assert.equal(report.health.protocol.status, "ok");
  assert.equal(report.health.status, "healthy");
  assert.equal(report.recentEvents.length >= 8, true);
});

test("health marks authentication failure", async () => {
  const bus = new InMemoryConnectionEventBus();
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
  const diagnostics = new ConnectionDiagnostics(bus, manager);

  await assert.rejects(() => manager.connect());

  const report = diagnostics.report();
  assert.equal(report.connection.state, "failed");
  assert.equal(report.health.authentication.status, "error");
  assert.equal(report.health.authentication.consecutiveFailures, 1);
});

test("diagnostic history is bounded", async () => {
  const bus = new InMemoryConnectionEventBus();
  const manager = new ConnectionManager({
    ...deps(),
    events: bus,
  });
  const diagnostics = new ConnectionDiagnostics(bus, manager, 3);

  await manager.connect();
  const report = diagnostics.report();

  assert.equal(report.recentEvents.length, 3);
  assert.equal(
    report.recentEvents[0]!.sequence <
      report.recentEvents[1]!.sequence,
    true,
  );
});
