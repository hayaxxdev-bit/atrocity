import assert from "node:assert/strict";
import test from "node:test";
import {
  SignalWireCodec,
  type SignalWireMessage,
} from "../src/signal/index.js";

test("signal wire message round-trips", () => {
  const codec = new SignalWireCodec();
  const message: SignalWireMessage = {
    header: {
      ratchetKey: new Uint8Array(32).fill(1),
      previousChainLength: 7,
      messageNumber: 9,
    },
    ciphertext: new Uint8Array([10, 11, 12, 13]),
  };

  const encoded = codec.encode(message);
  const decoded = codec.decode(encoded);

  assert.deepEqual([...decoded.header.ratchetKey], [1, ...new Array(31).fill(1)]);
  assert.equal(decoded.header.previousChainLength, 7);
  assert.equal(decoded.header.messageNumber, 9);
  assert.deepEqual([...decoded.ciphertext], [10, 11, 12, 13]);
});

test("unknown fields are ignored", () => {
  const codec = new SignalWireCodec();
  const message: SignalWireMessage = {
    header: {
      ratchetKey: new Uint8Array(32).fill(2),
      previousChainLength: 1,
      messageNumber: 2,
    },
    ciphertext: new Uint8Array([8]),
  };

  const encoded = codec.encode(message);
  const extended = new Uint8Array([
    ...encoded,
    0x4a, 0x01, 0x09,
  ]);

  assert.doesNotThrow(() => codec.decode(extended));
});

test("duplicate required fields are rejected", () => {
  const codec = new SignalWireCodec();
  const message: SignalWireMessage = {
    header: {
      ratchetKey: new Uint8Array(32).fill(1),
      previousChainLength: 0,
      messageNumber: 0,
    },
    ciphertext: new Uint8Array([1]),
  };

  const encoded = codec.encode(message);
  const duplicate = new Uint8Array([
    ...encoded,
    0x28, 0x00,
  ]);

  assert.throws(() => codec.decode(duplicate));
});

test("invalid ratchet key length is rejected", () => {
  const codec = new SignalWireCodec();
  assert.throws(() => codec.encode({
    header: {
      ratchetKey: new Uint8Array(31),
      previousChainLength: 0,
      messageNumber: 0,
    },
    ciphertext: new Uint8Array([1]),
  }));
});
