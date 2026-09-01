import assert from "node:assert/strict";
import test from "node:test";
import { RequestIdGenerator } from "../src/protocol/index.js";

test("request ids are unique and prefixed", () => {
  const generator = new RequestIdGenerator({
    prefix: "test",
    now: () => 100,
    randomBytes: () => new Uint8Array([1,2,3,4,5,6]),
  });

  const a = generator.next();
  const b = generator.next();

  assert.notEqual(a, b);
  assert.equal(a.startsWith("test-"), true);
  assert.equal(b.startsWith("test-"), true);
});
