import assert from "node:assert/strict";
import test from "node:test";
import { MessageDeliveryTracker } from "../src/protocol/index.js";

test("message delivery follows monotonic lifecycle", async () => {
  const tracker = new MessageDeliveryTracker();
  const events: string[] = [];

  tracker.onEvent((event) => events.push(event.type));

  tracker.create("m1", "123@s.whatsapp.net", 1);
  await tracker.markQueued("m1", 2);
  await tracker.markSent("m1", 3);
  await tracker.markDelivered("m1", 4);
  await tracker.markRead("m1", 5);

  const record = tracker.get("m1")!;
  assert.equal(record.status, "read");
  assert.equal(record.sentAt, 3);
  assert.equal(record.deliveredAt, 4);
  assert.equal(record.readAt, 5);
  assert.deepEqual(events, [
    "message.created",
    "message.queued",
    "message.sent",
    "message.delivered",
    "message.read",
  ]);
});

test("delivery state rejects regressions", async () => {
  const tracker = new MessageDeliveryTracker();
  tracker.create("m2", "123@s.whatsapp.net");

  await assert.rejects(() => tracker.markSent("m2"));
});

test("failed delivery is terminal until retry semantics exist", async () => {
  const tracker = new MessageDeliveryTracker();
  tracker.create("m3", "123@s.whatsapp.net");

  await tracker.markFailed("m3", new Error("network"));
  assert.equal(tracker.get("m3")?.status, "failed");

  await assert.rejects(() => tracker.markQueued("m3"));
});

test("concurrent transitions for one message are serialized", async () => {
  const tracker = new MessageDeliveryTracker();
  tracker.create("m4", "123@s.whatsapp.net");

  await Promise.all([
    tracker.markQueued("m4"),
    tracker.markQueued("m4"),
  ]);

  assert.equal(tracker.get("m4")?.status, "queued");
});
