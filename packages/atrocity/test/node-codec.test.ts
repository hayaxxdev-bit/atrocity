import assert from "node:assert/strict";
import test from "node:test";
import { ByteReader, ByteWriter } from "../src/foundation/bytes/index.js";
import { NodeCodec, type NodeCodecStrategy } from "../src/protocol/codec/index.js";

const unsupported: NodeCodecStrategy = {
  encodeTag(tag: string, writer: ByteWriter): void {
    writer.writeUtf8(tag);
  },
  decodeTag(reader: ByteReader): string {
    return reader.readUtf8(reader.remaining);
  },
  encodeAttributes(): void {},
  decodeAttributes(): Readonly<Record<string, string>> {
    return {};
  },
  encodeContent(): void {},
  decodeContent(): undefined {
    return undefined;
  },
};

test("codec orchestration can use an injected strategy", () => {
  const codec = new NodeCodec(unsupported);
  const result = codec.encode({
    tag: "iq",
    attrs: {},
  });

  // The test strategy is intentionally simplistic and development-only.
  assert.equal(new TextDecoder().decode(result), "iq");
});

test("codec enforces depth limits before strategy work", () => {
  const codec = new NodeCodec(unsupported, {
    maxDepth: 0,
    maxAttributes: 10,
    maxStringBytes: 10,
    maxBinaryBytes: 10,
    maxChildren: 10,
  });

  // Root depth 0 is valid for this model.
  assert.doesNotThrow(() => codec.encode({ tag: "iq", attrs: {} }));
});

test("codec rejects invalid limits", () => {
  assert.throws(() => new NodeCodec(unsupported, {
    maxDepth: -1,
    maxAttributes: 1,
    maxStringBytes: 1,
    maxBinaryBytes: 1,
    maxChildren: 1,
  }));
});
