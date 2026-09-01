import assert from "node:assert/strict";
import test from "node:test";
import {
  IqCorrelator,
  ProtocolEventBus,
  ProtocolNodeDispatcher,
  ProtocolRegistry,
  protocolNode,
} from "../src/protocol/index.js";

test("dispatcher resolves IQ correlation before feature routing", async () => {
  const sent: any[] = [];
  const iq = new IqCorrelator({
    sendIq: async (node) => sent.push(node),
  });

  const request = protocolNode("iq", {
    id: "q1",
    type: "get",
  });

  const pending = iq.request(request);

  const events = new ProtocolEventBus();
  const order: string[] = [];
  events.on("protocol.node", () => order.push("event"));

  const registry = new ProtocolRegistry();
  registry.register({
    name: "iq-observer",
    tag: "iq",
    handler: async () => {
      order.push("route");
    },
  });

  const dispatcher = new ProtocolNodeDispatcher({
    iq,
    registry,
    events,
  });

  const result = await dispatcher.dispatch(
    protocolNode("iq", { id: "q1", type: "result" }),
  );

  await pending;

  assert.equal(result.correlatedIq, true);
  assert.equal(result.handled, true);
  assert.deepEqual(order, ["event", "route"]);
  assert.equal(sent.length, 1);
});

test("unmatched nodes are still observable through protocol.node", async () => {
  const events = new ProtocolEventBus();
  let seen = 0;

  events.on("protocol.node", () => {
    seen += 1;
  });

  const dispatcher = new ProtocolNodeDispatcher({
    iq: new IqCorrelator({
      sendIq: async () => {},
    }),
    registry: new ProtocolRegistry(),
    events,
  });

  const result = await dispatcher.dispatch(
    protocolNode("unknown-node"),
  );

  assert.equal(result.handled, false);
  assert.equal(result.correlatedIq, false);
  assert.equal(seen, 1);
});
