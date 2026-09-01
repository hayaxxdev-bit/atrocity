import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  ConnectionProtocolAdapter,
  createAtrocityRuntime,
} from "../src/index.js";
import { protocolNode } from "../src/protocol/index.js";

function fakeTransport() {
  return {
    state: "idle",
    connect: async () => {},
    close: async () => {},
  };
}

test("composition root creates one shared protocol/connection/client graph", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atrocity-composition-"));

  try {
    const runtime = createAtrocityRuntime({
      stateDirectory: directory,
      transport: fakeTransport() as never,
      sendProtocolNode: async () => {},
      connectionDependencies: {
        handshake: { run: async () => {} },
        authenticate: { run: async () => {} },
        sync: { run: async () => {} },
      },
    });

    assert.equal(runtime.client.snapshot().connection.state, "created");
    assert.equal(runtime.connection, runtime.client["options"]["connection"]);
    assert.equal(runtime.protocol.state, "created");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("composition provides shared lifecycle diagnostics", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atrocity-composition-"));
  try {
    const runtime = createAtrocityRuntime({
      stateDirectory: directory,
      transport: fakeTransport() as never,
      sendProtocolNode: async () => {},
      connectionDependencies: {
        handshake: { run: async () => {} },
        authenticate: { run: async () => {} },
        sync: { run: async () => {} },
      },
    });

    await runtime.client.connect();
    const report = runtime.client.diagnostics();

    assert.equal(report.connection.state, "ready");
    assert.equal(report.health.status, "healthy");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
