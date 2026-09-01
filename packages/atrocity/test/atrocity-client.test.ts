import assert from "node:assert/strict";
import test from "node:test";
import {
  AtrocityClient,
  ConnectionDiagnostics,
  ConnectionManager,
  InMemoryConnectionEventBus,
} from "../src/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

function connection() {
  const events = new InMemoryConnectionEventBus();

  const manager = new ConnectionManager({
    connectionId: "client-test",
    events,
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

  return { manager, events };
}

test("AtrocityClient provides a stable facade", async () => {
  const { manager, events } = connection();
  const diagnostics = new ConnectionDiagnostics(events, manager);

  const sent: string[] = [];

  const client = new AtrocityClient({
    connection: manager,
    diagnostics,
    protocol: {
      sendNode: async (node) => {
        sent.push(node.tag);
      },
    },
  });

  await client.connect();

  assert.equal(client.state, "ready");
  assert.equal(client.capabilities.protocolNodes, true);
  assert.equal(client.capabilities.diagnostics, true);

  await client.sendNode(
    protocolNode("message", { id: "1" }),
  );

  assert.deepEqual(sent, ["message"]);
});

test("AtrocityClient rejects send before ready", async () => {
  const { manager } = connection();
  const client = new AtrocityClient({
    connection: manager,
  });

  await assert.rejects(() =>
    client.sendNode(protocolNode("message")),
  );
});

test("client follows connection events", async () => {
  const { manager } = connection();
  const client = new AtrocityClient({
    connection: manager,
  });

  await manager.connect();
  assert.equal(client.state, "ready");

  await manager.close();
  assert.equal(client.state, "closed");
});
