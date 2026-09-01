import assert from "node:assert/strict";
import test from "node:test";
import {
  AtrocityClient,
  ATROCITY_PUBLIC_API_VERSION,
  CapabilityRegistry,
  ConnectionManager,
} from "../src/index.js";

function connection() {
  return new ConnectionManager({
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
  });
}

test("public API exposes versioned capabilities", async () => {
  const client = new AtrocityClient({
    connection: connection(),
  });

  assert.equal(
    ATROCITY_PUBLIC_API_VERSION,
    1,
  );
  assert.equal(
    client.capabilities.connection.status,
    "available",
  );
  assert.equal(
    client.capabilities["protocol.nodes"].status,
    "unavailable",
  );
});

test("capabilities are versioned", () => {
  const registry = new CapabilityRegistry();
  const snapshot = registry.snapshot();

  assert.equal(snapshot.connection.version, 1);
  assert.equal(snapshot.media.status, "unavailable");
});

test("snapshot contains the public API version", () => {
  const client = new AtrocityClient({
    connection: connection(),
  });

  assert.equal(
    client.snapshot().apiVersion,
    ATROCITY_PUBLIC_API_VERSION,
  );
});

test("unavailable capability gets public error", async () => {
  const client = new AtrocityClient({
    connection: connection(),
  });

  await assert.rejects(
    () =>
      client.sendNode({
        tag: "message",
        attrs: {},
      } as never),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "AtrocityClientError",
  );
});
