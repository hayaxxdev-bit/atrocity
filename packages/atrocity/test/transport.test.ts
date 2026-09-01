import assert from "node:assert/strict";
import test from "node:test";
import {
  createTransportPair,
  TransportError,
} from "../src/transport/index.js";

test("in-memory transport pair exchanges isolated byte copies", async () => {
  const [left, right] = createTransportPair();

  const received: number[] = [];
  right.setHandlers({
    onData(data) {
      received.push(...data);
    },
  });

  await left.connect();
  await right.connect();

  const payload = new Uint8Array([1, 2, 3]);
  await left.send(payload);
  payload[0] = 99;

  assert.deepEqual(received, [1, 2, 3]);
  assert.equal(left.state, "open");
  assert.equal(right.state, "open");
});

test("send is rejected while transport is not open", async () => {
  const [left] = createTransportPair();

  await assert.rejects(
    left.send(new Uint8Array([1])),
    (error: unknown) =>
      error instanceof TransportError &&
      error.code === "TRANSPORT_NOT_OPEN",
  );
});

test("close produces a terminal closed state", async () => {
  const [left] = createTransportPair();
  let reason: string | undefined;

  left.setHandlers({
    onClose(info) {
      reason = info.reason;
    },
  });

  await left.connect();
  await left.close({ reason: "requested" });

  assert.equal(left.state, "closed");
  assert.equal(reason, "requested");
});
