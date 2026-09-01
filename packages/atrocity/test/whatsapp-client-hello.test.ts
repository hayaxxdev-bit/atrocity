import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWhatsAppClientHello,
  validateEphemeral,
} from "../src/protocol/index.js";

test("ClientHello uses exactly one X25519 public key", () => {
  const ephemeral = new Uint8Array(32).fill(7);
  const message = buildWhatsAppClientHello({
    ephemeralPublicKey: ephemeral,
  });

  assert.equal(message.type, "clientHello");
  assert.equal(message.clientHello.ephemeral.length, 32);
  assert.deepEqual(
    [...message.clientHello.ephemeral],
    [...ephemeral],
  );
});

test("invalid ephemeral key sizes are rejected", () => {
  assert.throws(() =>
    validateEphemeral(new Uint8Array(31)),
  );

  assert.throws(() =>
    validateEphemeral(new Uint8Array(33)),
  );
});

test("builder clones the ephemeral key", () => {
  const ephemeral = new Uint8Array(32).fill(9);
  const message = buildWhatsAppClientHello({
    ephemeralPublicKey: ephemeral,
  });

  ephemeral[0] = 99;

  assert.equal(message.clientHello.ephemeral[0], 9);
});
