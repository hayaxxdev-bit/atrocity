import assert from "node:assert/strict";
import test from "node:test";
import { HandshakeMessageCodec } from "../src/protocol/handshake/index.js";

const codec = new HandshakeMessageCodec();

test("clientHello matches protobuf field layout", () => {
  const msg = { type: "clientHello", clientHello: { ephemeral: new Uint8Array([1,2,3]) } } as const;
  assert.deepEqual([...codec.encode(msg)], [0x12, 0x05, 0x0a, 0x03, 1,2,3]);
  assert.deepEqual(codec.decode(codec.encode(msg)), msg);
});

test("serverHello round-trips", () => {
  const msg = {
    type: "serverHello",
    serverHello: {
      ephemeral: new Uint8Array([1,2]),
      static: new Uint8Array([3,4]),
      payload: new Uint8Array([5,6]),
    },
  } as const;
  assert.deepEqual(codec.decode(codec.encode(msg)), msg);
});

test("clientFinish round-trips", () => {
  const msg = {
    type: "clientFinish",
    clientFinish: {
      static: new Uint8Array([1,2,3]),
      payload: new Uint8Array([4,5]),
    },
  } as const;
  assert.deepEqual(codec.decode(codec.encode(msg)), msg);
});

test("multiple oneof variants are rejected", () => {
  const raw = new Uint8Array([
    0x12, 0x03, 0x0a, 0x01, 0x01,
    0x1a, 0x03, 0x0a, 0x01, 0x02,
  ]);
  assert.throws(() => codec.decode(raw));
});
