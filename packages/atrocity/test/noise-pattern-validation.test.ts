import assert from "node:assert/strict";
import test from "node:test";
import {
  createHandshakePattern,
  TEST_XX_PATTERN,
  TEST_NN_PATTERN,
} from "../src/noise/index.js";

test("accepts canonical NN and XX patterns", () => {
  assert.equal(TEST_NN_PATTERN.messages.length, 2);
  assert.equal(TEST_XX_PATTERN.messages.length, 3);
});

test("rejects repeated DH operation", () => {
  assert.throws(() =>
    createHandshakePattern({
      name: "BAD",
      initiatorPreMessage: [],
      responderPreMessage: [],
      messages: [["e", "ee"], ["e", "ee"]],
    }),
  );
});

test("rejects repeated ephemeral transmission by one party", () => {
  assert.throws(() =>
    createHandshakePattern({
      name: "BAD",
      initiatorPreMessage: [],
      responderPreMessage: [],
      messages: [["e"], ["e"], ["e"]],
    }),
  );
});

test("rejects lowercase pattern names", () => {
  assert.throws(() =>
    createHandshakePattern({
      name: "xx",
      initiatorPreMessage: [],
      responderPreMessage: [],
      messages: [["e"], ["e", "ee"]],
    }),
  );
});
