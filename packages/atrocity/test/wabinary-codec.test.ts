import assert from "node:assert/strict";
import test from "node:test";
import { protocolNode, childNodes, binaryContent, textContent } from "../src/protocol/node/index.js";
import { WABinaryCodec } from "../src/protocol/codec/index.js";
import { MINIMAL_WABINARY_PROFILE } from "../src/protocol/profiles/index.js";

const codec = new WABinaryCodec({
  profile: MINIMAL_WABINARY_PROFILE,
  limits: {
    maxDepth: 8,
    maxAttributes: 16,
    maxChildren: 16,
    maxStringBytes: 1024,
    maxBinaryBytes: 1024,
  },
});

test("round-trips a tokenized node", () => {
  const node = protocolNode("iq", {
    type: "get",
    id: "42",
  });

  const encoded = codec.encode(node);
  const decoded = codec.decode(encoded);

  assert.deepEqual(decoded, node);
});

test("round-trips nested nodes", () => {
  const node = protocolNode("iq", { type: "get" }, {
    kind: "nodes",
    value: [
      protocolNode("message", { id: "42" }, {
        kind: "text",
        value: "hello",
      }),
    ],
  });

  const decoded = codec.decode(codec.encode(node));

  assert.equal(decoded.tag, "iq");
  assert.equal(childNodes(decoded).length, 1);
  assert.equal(childNodes(decoded)[0]!.tag, "message");
  assert.equal(textContent(childNodes(decoded)[0]!), "hello");
});

test("round-trips binary content", () => {
  const node = protocolNode("message", {}, {
    kind: "binary",
    value: new Uint8Array([0, 1, 2, 250, 255]),
  });

  const decoded = codec.decode(codec.encode(node));

  assert.deepEqual([...binaryContent(decoded)!], [0, 1, 2, 250, 255]);
});

test("encodes list size using LIST_8 for small nodes", () => {
  const bytes = codec.encode(protocolNode("iq", {}));
  assert.equal(bytes[0], 248);
});

test("supports BINARY_20 length encoding", () => {
  const payload = new Uint8Array(256).fill(7);
  const bytes = codec.encode(protocolNode("message", {}, {
    kind: "binary",
    value: payload,
  }));

  // list_8, size=2, token(message), BINARY_20, 0x0100
  assert.equal(bytes[3], 253);
  assert.equal(bytes[4], 1);
  assert.equal(bytes[5], 0);
});

test("rejects trailing bytes", () => {
  const bytes = codec.encode(protocolNode("iq", {}));
  assert.throws(() => codec.decode(new Uint8Array([...bytes, 0])));
});
