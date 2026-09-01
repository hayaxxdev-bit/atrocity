import assert from "node:assert/strict";
import test from "node:test";
import { WhatsAppNoiseFrameCodec } from "../src/transport/index.js";
import { WHATSAPP_NOISE_HEADER } from "../src/noise/index.js";

test("WhatsApp noise frame round-trips header and ciphertext", () => {
  const codec = new WhatsAppNoiseFrameCodec();
  const ciphertext = new Uint8Array([1,2,3,4]);

  const frame = codec.encode(
    WHATSAPP_NOISE_HEADER,
    ciphertext,
  );

  const decoded = codec.decode(
    WHATSAPP_NOISE_HEADER,
    frame,
  );

  assert.deepEqual([...decoded.header], [...WHATSAPP_NOISE_HEADER]);
  assert.deepEqual([...decoded.ciphertext], [1,2,3,4]);
});

test("header mismatch is rejected", () => {
  const codec = new WhatsAppNoiseFrameCodec();
  const frame = codec.encode(
    WHATSAPP_NOISE_HEADER,
    new Uint8Array([1]),
  );

  const badHeader = WHATSAPP_NOISE_HEADER.slice();
  badHeader[0] ^= 0xff;

  assert.throws(() => codec.decode(badHeader, frame));
});

test("declared payload length mismatch is rejected", () => {
  const codec = new WhatsAppNoiseFrameCodec();
  const frame = codec.encode(
    WHATSAPP_NOISE_HEADER,
    new Uint8Array([1,2]),
  );

  frame[WHATSAPP_NOISE_HEADER.length + 3] = 3;

  assert.throws(() =>
    codec.decode(WHATSAPP_NOISE_HEADER, frame),
  );
});

test("frame limits are enforced", () => {
  const codec = new WhatsAppNoiseFrameCodec({
    maxFrameBytes: 8,
    maxCiphertextBytes: 8,
  });

  assert.throws(() =>
    codec.encode(
      WHATSAPP_NOISE_HEADER,
      new Uint8Array([1,2,3,4,5]),
    ),
  );
});
