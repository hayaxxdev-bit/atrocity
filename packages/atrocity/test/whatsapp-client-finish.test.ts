import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWhatsAppClientFinish,
  composeWhatsAppClientFinish,
} from "../src/protocol/index.js";

test("ClientFinish contains encrypted static and payload", () => {
  const encryptedStatic = new Uint8Array(32).fill(1);
  const encryptedPayload = new Uint8Array(20).fill(2);

  const message = buildWhatsAppClientFinish({
    encryptedStatic,
    encryptedPayload,
  });

  assert.equal(message.type, "clientFinish");
  assert.deepEqual(
    [...message.clientFinish.static],
    [...encryptedStatic],
  );
  assert.deepEqual(
    [...message.clientFinish.payload],
    [...encryptedPayload],
  );
});

test("ClientFinish builder clones encrypted fields", () => {
  const encryptedStatic = new Uint8Array(32).fill(3);
  const encryptedPayload = new Uint8Array(20).fill(4);

  const message = buildWhatsAppClientFinish({
    encryptedStatic,
    encryptedPayload,
  });

  encryptedStatic[0] = 99;
  encryptedPayload[0] = 98;

  assert.equal(message.clientFinish.static[0], 3);
  assert.equal(message.clientFinish.payload[0], 4);
});

test("ClientFinish rejects fields shorter than authentication tag", () => {
  assert.throws(() =>
    buildWhatsAppClientFinish({
      encryptedStatic: new Uint8Array(15),
      encryptedPayload: new Uint8Array(20),
    }),
  );

  assert.throws(() =>
    buildWhatsAppClientFinish({
      encryptedStatic: new Uint8Array(32),
      encryptedPayload: new Uint8Array(15),
    }),
  );
});

test("ClientFinish composer encrypts payload exactly once before building", () => {
  const calls: number[] = [];

  const message = composeWhatsAppClientFinish(
    new Uint8Array(32).fill(5),
    new Uint8Array([1,2,3]),
    {
      encryptPayload: (payload) => {
        calls.push(payload.length);
        return new Uint8Array(payload.length + 16).fill(6);
      },
    },
  );

  assert.deepEqual(calls, [3]);
  assert.equal(message.clientFinish.static.length, 32);
  assert.equal(message.clientFinish.payload.length, 19);
});
