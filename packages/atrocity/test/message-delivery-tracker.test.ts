import assert from "node:assert/strict";
import test from "node:test";
import {
  MessageDeliveryTracker,
  MessageDeliveryRuntime,
  mapWhatsAppMessageReceipt,
} from "../src/protocol/features/message/index.js";
import { protocolNode } from "../src/protocol/index.js";

test("message delivery follows send → ack → delivered → read", () => {
  const tracker = new MessageDeliveryTracker();

  tracker.create({ id: "m1", remoteJid: "123@s.whatsapp.net" });
  tracker.transition("m1", "encrypted");
  tracker.transition("m1", "sent");
  tracker.transition("m1", "server-ack");
  tracker.transition("m1", "delivered");
  tracker.transition("m1", "read");

  assert.equal(tracker.get("m1")?.state, "read");
});

test("retry transitions to retry-required and increments attempts", () => {
  const tracker = new MessageDeliveryTracker();

  tracker.create({ id: "m2", remoteJid: "123@s.whatsapp.net" });
  tracker.transition("m2", "encrypted");
  tracker.transition("m2", "sent");
  tracker.transition("m2", "retry");

  assert.equal(tracker.get("m2")?.state, "retry-required");
  assert.equal(tracker.get("m2")?.attempts, 1);

  tracker.transition("m2", "encrypted");
  assert.equal(tracker.get("m2")?.state, "encrypted");
});

test("receipt mapper detects retry and ack", () => {
  const retry = mapWhatsAppMessageReceipt(
    protocolNode("message", {
      id: "m3",
      type: "retry",
    }),
  );

  const ack = mapWhatsAppMessageReceipt(
    protocolNode("message", {
      id: "m3",
      type: "server-ack",
    }),
  );

  assert.equal(retry?.event, "retry");
  assert.equal(ack?.event, "server-ack");
});

test("runtime invokes retry executor only after retry receipt", async () => {
  const calls: string[] = [];
  const runtime = new MessageDeliveryRuntime(
    undefined,
    {
      retry: async (id) => {
        calls.push(id);
      },
    },
  );

  runtime.register("m4", "123@s.whatsapp.net");
  runtime.markEncrypted("m4");
  runtime.markSent("m4");

  await runtime.processReceipt(
    protocolNode("message", {
      id: "m4",
      type: "retry",
    }),
  );

  assert.deepEqual(calls, ["m4"]);
});
