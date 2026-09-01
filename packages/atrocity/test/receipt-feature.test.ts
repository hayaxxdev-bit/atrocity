import assert from "node:assert/strict";
import test from "node:test";
import {
  MessageDeliveryTracker,
  ProtocolRegistry,
  ReceiptFeature,
  ReceiptNormalizer,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("receipt normalizer maps delivery metadata", () => {
  const normalizer = new ReceiptNormalizer();
  const receipt = normalizer.normalize(
    protocolNode("receipt", {
      id: "m1",
      from: "123@s.whatsapp.net",
      type: "delivered",
      t: "42",
    }),
  );

  assert.equal(receipt.messageId, "m1");
  assert.equal(receipt.kind, "delivered");
  assert.equal(receipt.timestamp, 42);
});

test("receipt feature advances tracked message to delivered", async () => {
  const registry = new ProtocolRegistry();
  const tracker = new MessageDeliveryTracker();
  tracker.create("m1", "123@s.whatsapp.net", 1);

  const events: any[] = [];
  const feature = new ReceiptFeature(registry, {
    tracker,
    onEvent: (event) => events.push(event),
  });

  const runtime = feature.createProtocolFeature();
  await runtime.start({ featureName: "receipt" });

  await registry.dispatch(
    protocolNode("receipt", {
      id: "m1",
      type: "delivered",
      t: "10",
    }),
    { receivedAt: 10 },
  );

  assert.equal(tracker.get("m1")?.status, "delivered");
  assert.equal(events.length, 1);
  assert.equal(events[0].receipt.kind, "delivered");
});

test("read receipt advances a sent message through delivered to read", async () => {
  const registry = new ProtocolRegistry();
  const tracker = new MessageDeliveryTracker();
  tracker.create("m2", "123@s.whatsapp.net", 1);
  await tracker.markQueued("m2", 2);
  await tracker.markSent("m2", 3);

  const feature = new ReceiptFeature(registry, { tracker });
  const runtime = feature.createProtocolFeature();
  await runtime.start({ featureName: "receipt" });

  await registry.dispatch(
    protocolNode("receipt", {
      id: "m2",
      type: "read",
    }),
    { receivedAt: 10 },
  );

  assert.equal(tracker.get("m2")?.status, "read");
});
