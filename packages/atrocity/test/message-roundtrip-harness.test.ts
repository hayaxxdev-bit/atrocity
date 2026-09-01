import assert from "node:assert/strict";
import test from "node:test";
import {
  MessageRoundTripHarness,
} from "../src/protocol/features/message/index.js";
import { protocolNode } from "../src/protocol/index.js";

test("plaintext survives complete outbound/inbound harness", async () => {
  const plaintext = new Uint8Array([1, 2, 3, 4]);
  const calls: string[] = [];

  const harness = new MessageRoundTripHarness({
    serialize: (value) => {
      calls.push("serialize");
      return value.slice();
    },
    deserialize: (value) => {
      calls.push("deserialize");
      return value.slice();
    },
    outboundSignal: {
      encryptMessage: async (_jid, value) => {
        calls.push("encrypt");
        return {
          type: "msg",
          ciphertext: new Uint8Array(
            [...value].map((v) => v ^ 0xff),
          ),
        };
      },
    },
    inboundSignal: {
      decryptMessage: async (_jid, _type, ciphertext) => {
        calls.push("decrypt");
        return new Uint8Array(
          [...ciphertext].map((v) => v ^ 0xff),
        );
      },
    },
    outboundSession: {
      ensureSession: async () => {},
      commit: async () => calls.push("commit"),
    },
    outerMessage: (id, jid, envelope) =>
      protocolNode(
        "message",
        { id, to: jid },
        { kind: "nodes", value: [envelope] },
      ),
  });

  const result = await harness.run(
    "m1",
    "123@s.whatsapp.net",
    plaintext,
  );

  assert.equal(result.status, "round-tripped");
  assert.deepEqual([...result.recoveredPlaintext], [...plaintext]);
  assert.equal(result.signalType, "msg");
  assert.deepEqual(calls, [
    "serialize",
    "encrypt",
    "commit",
    "deserialize",
  ]);
});

test("pkmsg path uses session coordinator before decrypt", async () => {
  const calls: string[] = [];

  const harness = new MessageRoundTripHarness({
    serialize: (value) => value.slice(),
    deserialize: (value) => value.slice(),
    outboundSignal: {
      encryptMessage: async () => ({
        type: "pkmsg",
        ciphertext: new Uint8Array([7]),
      }),
    },
    inboundSignal: {
      decryptMessage: async () => {
        calls.push("decrypt");
        return new Uint8Array([9]);
      },
    },
    outboundSession: {
      ensureSession: async () => calls.push("ensure"),
      commit: async () => calls.push("commit"),
    },
    outerMessage: (id, jid, envelope) =>
      protocolNode(
        "message",
        { id, to: jid },
        { kind: "nodes", value: [envelope] },
      ),
  });

  const result = await harness.run(
    "m2",
    "123@s.whatsapp.net",
    new Uint8Array([9]),
  );

  assert.equal(result.signalType, "pkmsg");
  assert.deepEqual(calls, ["ensure", "decrypt", "commit"]);
});

test("harness rejects plaintext mismatch", async () => {
  const harness = new MessageRoundTripHarness({
    serialize: (value) => value.slice(),
    deserialize: () => new Uint8Array([99]),
    outboundSignal: {
      encryptMessage: async () => ({
        type: "msg",
        ciphertext: new Uint8Array([1]),
      }),
    },
    inboundSignal: {
      decryptMessage: async () => new Uint8Array([1]),
    },
    outboundSession: {
      ensureSession: async () => {},
      commit: async () => {},
    },
    outerMessage: (id, jid, envelope) =>
      protocolNode(
        "message",
        { id, to: jid },
        { kind: "nodes", value: [envelope] },
      ),
  });

  await assert.rejects(() =>
    harness.run(
      "m3",
      "123@s.whatsapp.net",
      new Uint8Array([1]),
    ),
  );
});
