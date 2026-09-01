import assert from "node:assert/strict";
import test from "node:test";
import {
  findChild,
  findPath,
  getAttribute,
  isIq,
  isMessage,
  isSuccessfulIq,
  requireAttribute,
  requireChild,
  validateNode,
  walk,
} from "../src/protocol/index.js";
import { protocolNode } from "../src/protocol/node/index.js";

test("node predicates and attributes", () => {
  const node = protocolNode(
    "iq",
    { id: "1", type: "result" },
    protocolNode("message", { id: "m1" }),
  );

  assert.equal(isIq(node), true);
  assert.equal(isMessage(findChild(node, { tag: "message" })), true);
  assert.equal(getAttribute(node, "id"), "1");
  assert.equal(isSuccessfulIq(node), true);
  assert.equal(requireAttribute(node, "type"), "result");
});

test("path traversal finds nested protocol nodes", () => {
  const node = protocolNode(
    "iq",
    { id: "1" },
    protocolNode(
      "result",
      {},
      protocolNode("device", { id: "42" }),
    ),
  );

  const found = findPath(node, [
    { tag: "result" },
    { tag: "device", attrs: { id: "42" } },
  ]);

  assert.equal(found?.tag, "device");
});

test("required child and validation produce deterministic failures", () => {
  const node = protocolNode("iq", { type: "get" });

  assert.throws(() =>
    requireChild(node, { tag: "result" }),
  );

  const result = validateNode(node, {
    tag: "iq",
    requiredAttributes: ["id"],
  });

  assert.equal(result.valid, false);
  assert.equal(result.issues[0]?.code, "MISSING_ATTRIBUTE");
});

test("walk traverses nested nodes", () => {
  const root = protocolNode(
    "iq",
    {},
    protocolNode(
      "message",
      {},
      protocolNode("message", { id: "2" }),
    ),
  );

  const result = walk(root, (node) => node.tag === "message");
  assert.equal(result.length, 2);
});
