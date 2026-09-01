import assert from "node:assert/strict";
import test from "node:test";
import {
  WHATSAPP_NOISE_HEADER,
  WHATSAPP_NOISE_MODE,
  WHATSAPP_NOISE_PROFILE,
} from "../src/noise/index.js";

test("captures current reference Noise constants", () => {
  assert.equal(
    WHATSAPP_NOISE_MODE,
    "Noise_XX_25519_AESGCM_SHA256\0\0\0\0",
  );
  assert.deepEqual([...WHATSAPP_NOISE_HEADER], [87, 65, 6, 3]);
  assert.equal(WHATSAPP_NOISE_PROFILE.handshakePattern.name, "XX");
  assert.deepEqual(
    WHATSAPP_NOISE_PROFILE.handshakePattern.messages,
    [["e"], ["e", "ee", "s", "es"], ["s", "se"]],
  );
});

test("profile data is cloned", () => {
  assert.notEqual(
    WHATSAPP_NOISE_PROFILE.noiseHeader,
    WHATSAPP_NOISE_HEADER,
  );
});
