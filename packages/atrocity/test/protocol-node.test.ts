import assert from "node:assert/strict";
import test from "node:test";
import {
  binaryContent,
  childNodes,
  hasChildNodes,
  isBinaryNode,
  isTextNode,
  protocolNode,
  textContent,
} from "../src/protocol/index.js";

test("creates an immutable protocol node with attributes", () => {
  const node = protocolNode("iq", { type: "get", id: "abc" });

  assert.equal(node.tag, "iq");
  assert.equal(node.attrs.type, "get");
  assert.equal(Object.isFrozen(node), true);
  assert.equal(Object.isFrozen(node.attrs), true);
});

test("creates typed text content", () => {
  const node = protocolNode("message", {}, {
    kind: "text",
    value: "hello",
  });

  assert.equal(isTextNode(node), true);
  assert.equal(textContent(node), "hello");
  assert.equal(hasChildNodes(node), false);
});

test("copies binary content so callers cannot mutate node state", () => {
  const source = new Uint8Array([1, 2, 3]);
  const node = protocolNode("enc", {}, {
    kind: "binary",
    value: source,
  });

  source[0] = 99;

  assert.equal(isBinaryNode(node), true);
  assert.deepEqual([...binaryContent(node)!], [1, 2, 3]);
});

test("creates immutable nested child nodes", () => {
  const child = protocolNode("query", { xmlns: "test" });
  const node = protocolNode("iq", {}, {
    kind: "nodes",
    value: [child],
  });

  const children = childNodes(node);

  assert.equal(children.length, 1);
  assert.equal(children[0]!.tag, "query");
  assert.equal(Object.isFrozen(children[0]), true);
  assert.equal(Object.isFrozen(children), true);
});

test("rejects an empty tag", () => {
  assert.throws(() => protocolNode(""));
});
