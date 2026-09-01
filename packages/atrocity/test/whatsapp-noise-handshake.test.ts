import assert from "node:assert/strict";
import test from "node:test";
import {
  WhatsAppNoiseHandshake,
  transcriptFromSnapshot,
} from "../src/protocol/index.js";
import type { HandshakeMessage } from "../src/protocol/index.js";

test("complete handshake orchestration follows stage order", () => {
  const calls: string[] = [];

  const encodeHandshake = (message: HandshakeMessage) => {
    calls.push(message.type);
    return new Uint8Array(
      message.type === "clientHello" ? [1, 2] : [3, 4],
    );
  };

  const handshake = new WhatsAppNoiseHandshake({
    ephemeralPublicKey: new Uint8Array(32).fill(1),
    encodeHandshake,
    processServerHello: () => {
      calls.push("processServerHello");
      return {
        encryptedStatic: new Uint8Array(32).fill(8),
      };
    },
    buildClientPayload: () => {
      calls.push("buildClientPayload");
      return new Uint8Array([9, 9]);
    },
    encryptPayload: (payload) => {
      calls.push("encryptPayload");
      return new Uint8Array(payload.length + 16).fill(7);
    },
    finishTransport: () => {
      calls.push("finishTransport");
    },
  });

  const hello = handshake.createClientHello();

  handshake.processServerHello({
    type: "serverHello",
    serverHello: {
      ephemeral: new Uint8Array(32).fill(2),
      static: new Uint8Array(16).fill(3),
      payload: new Uint8Array(16).fill(4),
    },
  });

  const finish = handshake.createClientFinish();
  handshake.finish();

  assert.equal(hello.length, 2);
  assert.equal(finish.length, 2);
  assert.equal(handshake.stage, "transport-ready");

  assert.deepEqual(calls, [
    "clientHello",
    "processServerHello",
    "buildClientPayload",
    "encryptPayload",
    "clientFinish",
    "finishTransport",
  ]);
});

test("handshake cannot skip stages", () => {
  const handshake = new WhatsAppNoiseHandshake({
    ephemeralPublicKey: new Uint8Array(32),
    encodeHandshake: () => new Uint8Array([1]),
    processServerHello: () => ({
      encryptedStatic: new Uint8Array(32),
    }),
    buildClientPayload: () => new Uint8Array([1]),
    encryptPayload: () => new Uint8Array(17),
    finishTransport: () => {},
  });

  assert.throws(() => handshake.finish());
  assert.throws(() => handshake.createClientFinish());
});

test("transcript requires both outbound handshake messages", () => {
  const handshake = new WhatsAppNoiseHandshake({
    ephemeralPublicKey: new Uint8Array(32),
    encodeHandshake: () => new Uint8Array([1]),
    processServerHello: () => ({
      encryptedStatic: new Uint8Array(32),
    }),
    buildClientPayload: () => new Uint8Array([1]),
    encryptPayload: () => new Uint8Array(17),
    finishTransport: () => {},
  });

  handshake.createClientHello();

  assert.throws(() =>
    transcriptFromSnapshot(
      handshake.snapshot,
      new Uint8Array([2]),
    ),
  );
});
