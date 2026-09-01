import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeNoiseFrame,
  encodeNoiseFrame,
} from "../src/protocol/frame/index.js";

test("encodes and decodes a header plus opaque payload", () => {
  const header = new Uint8Array([87, 65, 6, 3]);
  const payload = new Uint8Array([1, 2, 3]);

  const frame = encodeNoiseFrame(header, payload);

  assert.deepEqual([...frame], [87, 65, 6, 3, 1, 2, 3]);
  assert.deepEqual([...decodeNoiseFrame(header, frame).payload], [1, 2, 3]);
});

test("rejects mismatched header", () => {
  const header = new Uint8Array([87, 65, 6, 3]);
  const bad = new Uint8Array([87, 65, 9, 3, 1]);

  assert.throws(() => decodeNoiseFrame(header, bad));
});
