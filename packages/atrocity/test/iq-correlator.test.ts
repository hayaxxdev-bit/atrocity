import assert from "node:assert/strict";
import test from "node:test";
import {
  IqClient,
  IqCorrelator,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("IQ response resolves matching request", async () => {
  let sent: any;
  let handler: ((node: any) => void) | undefined;

  const client = new IqClient({
    sendIq: async (node) => {
      sent = node;
    },
    onNode: (fn) => {
      handler = fn;
      return () => {
        handler = undefined;
      };
    },
  });

  const promise = client.request(
    protocolNode("iq", {
      id: "abc",
      type: "get",
    }),
  );

  handler!(
    protocolNode("iq", {
      id: "abc",
      type: "result",
    }),
  );

  const result = await promise;
  assert.equal(result.attrs.id, sent.attrs.id);
  assert.equal(client.correlator.pendingCount, 0);
  client.close();
});

test("IQ timeout rejects and removes request", async () => {
  const correlator = new IqCorrelator(
    {
      sendIq: async () => {},
    },
    5,
  );

  await assert.rejects(
    () =>
      correlator.request(
        protocolNode("iq", {
          id: "timeout",
          type: "get",
        }),
      ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === "IqError" &&
      error.message.includes("timed out"),
  );

  assert.equal(correlator.pendingCount, 0);
});

test("duplicate IQ ids are rejected", async () => {
  let release!: () => void;
  const correlator = new IqCorrelator({
    sendIq: async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    },
  }, 1000);

  const first = correlator.request(
    protocolNode("iq", {
      id: "dup",
      type: "get",
    }),
  );

  await assert.rejects(() =>
    correlator.request(
      protocolNode("iq", {
        id: "dup",
        type: "get",
      }),
    ),
  );

  release();
  correlator.rejectAll();
  await assert.rejects(() => first);
});

test("abort signal cancels pending IQ", async () => {
  const controller = new AbortController();
  const correlator = new IqCorrelator({
    sendIq: async () => {},
  }, 1000);

  const request = correlator.request(
    protocolNode("iq", {
      id: "abort",
      type: "get",
    }),
    { signal: controller.signal },
  );

  controller.abort();

  await assert.rejects(request);
  assert.equal(correlator.pendingCount, 0);
});

test("rejectAll releases every pending request", async () => {
  const correlator = new IqCorrelator({
    sendIq: async () => {},
  }, 1000);

  const a = correlator.request(protocolNode("iq", { id: "a", type: "get" }));
  const b = correlator.request(protocolNode("iq", { id: "b", type: "get" }));

  assert.equal(correlator.pendingCount, 2);

  correlator.rejectAll();
  assert.equal(correlator.pendingCount, 0);

  await assert.rejects(a);
  await assert.rejects(b);
});
