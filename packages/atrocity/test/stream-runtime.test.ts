import assert from "node:assert/strict";
import test from "node:test";
import {
  ProtocolRuntime,
  StreamRuntime,
  protocolNode,
} from "../src/protocol/index.js";

test("authenticated stream opens, negotiates capabilities, then starts protocol", async () => {
  const order: string[] = [];

  const protocol = new ProtocolRuntime({
    sendNode: async () => order.push("protocol-send"),
  });

  const stream = new StreamRuntime(
    {
      sendNode: async () => order.push("stream-open"),
      receiveNode: async () => {
        order.push("features");
        return protocolNode(
          "stream:features",
          {},
          protocolNode("message", { xmlns: "urn:xmpp:message" }),
        );
      },
    },
    protocol,
    {
      featureRequirements: [{
        feature: "message",
        required: ["messaging"],
      }],
      buildStreamOpenNode: () =>
        protocolNode("stream:open", { to: "whatsapp" }),
    },
  );

  stream.markAuthenticated();
  const result = await stream.open();

  assert.equal(result.state, "ready");
  assert.equal(stream.state, "ready");
  assert.equal(result.capabilities.messaging.supported, true);
  assert.deepEqual(order, [
    "stream-open",
    "features",
  ]);
  assert.equal(result.protocol.state, "started");
});

test("stream cannot open before authentication", async () => {
  const protocol = new ProtocolRuntime({
    sendNode: async () => {},
  });

  const stream = new StreamRuntime(
    {
      sendNode: async () => {},
      receiveNode: async () => protocolNode("stream:features"),
    },
    protocol,
    {
      buildStreamOpenNode: () =>
        protocolNode("stream:open"),
    },
  );

  await assert.rejects(() => stream.open());
});

test("stream opening failure transitions to failed", async () => {
  const protocol = new ProtocolRuntime({
    sendNode: async () => {},
  });

  const stream = new StreamRuntime(
    {
      sendNode: async () => {
        throw new Error("wire failure");
      },
      receiveNode: async () =>
        protocolNode("stream:features"),
    },
    protocol,
    {
      buildStreamOpenNode: () =>
        protocolNode("stream:open"),
    },
  );

  stream.markAuthenticated();
  await assert.rejects(() => stream.open());

  assert.equal(stream.state, "failed");
});

test("close delegates protocol shutdown", async () => {
  const protocol = new ProtocolRuntime({
    sendNode: async () => {},
  });

  const stream = new StreamRuntime(
    {
      sendNode: async () => {},
      receiveNode: async () =>
        protocolNode(
          "stream:features",
          {},
          protocolNode("message", { xmlns: "urn:xmpp:message" }),
        ),
    },
    protocol,
    {
      buildStreamOpenNode: () =>
        protocolNode("stream:open"),
    },
  );

  stream.markAuthenticated();
  await stream.open();
  await stream.close();

  assert.equal(stream.state, "closed");
  assert.equal(protocol.state, "stopped");
});
