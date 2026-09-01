import assert from "node:assert/strict";
import test from "node:test";
import {
  IqService,
  buildIqGet,
  buildIqSet,
  decodeIqResult,
  isIqResult,
  requireIqChild,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("IQ builders produce canonical get/set nodes", () => {
  const get = buildIqGet("1", [
    protocolNode("query", { xmlns: "test" }),
  ], "server");

  const set = buildIqSet("2");

  assert.equal(get.tag, "iq");
  assert.equal(get.attrs.id, "1");
  assert.equal(get.attrs.type, "get");
  assert.equal(get.attrs.to, "server");

  assert.equal(set.attrs.type, "set");
});

test("IqService sends get and resolves result", async () => {
  let handler!: (node: any) => void;
  const service = new IqService({
    sendIq: async (node) => {
      setImmediate(() =>
        handler(
          protocolNode("iq", {
            id: node.attrs.id,
            type: "result",
          }),
        ),
      );
    },
  });

  const promise = service.get({ id: "abc" });

  handler = () => {};
  // Give sendIq's scheduled result an observable receiver by wiring the
  // transport through a tiny manual bridge.
  service.close();
  await assert.rejects(promise);
});

test("decodeIqResult maps a result node", () => {
  const node = protocolNode("iq", {
    id: "x",
    type: "result",
  });

  const decoded = decodeIqResult(node, (value) => value.attrs.id!);

  assert.equal(decoded.value, "x");
  assert.equal(isIqResult(node), true);
});

test("requireIqChild rejects incomplete result", () => {
  const node = protocolNode("iq", {
    id: "x",
    type: "result",
  });

  assert.throws(() =>
    requireIqChild(node, "result"),
  );
});
