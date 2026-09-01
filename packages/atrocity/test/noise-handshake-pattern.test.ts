import assert from "node:assert/strict";
import test from "node:test";
import { createHandshakePattern, TEST_XX_PATTERN } from "../src/noise/index.js";

test("creates and freezes a handshake pattern", () => {
  const pattern = createHandshakePattern({
    name: "XX_25519_AESGCM_SHA256",
    preMessages: [],
    messages: [["e"], ["e", "ee"], ["s", "es"]],
  });

  assert.equal(pattern.name, "XX_25519_AESGCM_SHA256");
  assert.equal(Object.isFrozen(pattern), true);
  assert.equal(Object.isFrozen(pattern.messages), true);
  assert.deepEqual(pattern.messages[1], ["e", "ee"]);
});

test("test profile exposes a valid pattern", () => {
  assert.equal(TEST_XX_PATTERN.messages.length, 3);
  assert.deepEqual(TEST_XX_PATTERN.messages[0], ["e"]);
});

test("rejects unknown handshake tokens", () => {
  assert.throws(() =>
    createHandshakePattern({
      name: "bad",
      preMessages: [],
      messages: [["unknown" as never]],
    }),
  );
});
