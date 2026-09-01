import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import { NoiseTransportCipher } from "../src/noise/noise-cipher-state.js";
import {
  WhatsAppProtocolTransport,
} from "../src/transport/index.js";
import { WhatsAppNoiseTransport } from "../src/transport/index.js";
import { createTransportPair } from "../src/transport/in-memory-transport.js";
import { WABinaryCodec } from "../src/protocol/codec/wabinary-codec.js";
import { WABINARY_MINIMAL_PROFILE } from "../src/protocol/profiles/wabinary-minimal.js";
import { protocolNode } from "../src/protocol/node/protocol-node.js";

function makeEncryptedPair() {
  const [aRaw, bRaw] = createTransportPair();
  const wabinary = new WABinaryCodec({
    profile: WABINARY_MINIMAL_PROFILE,
  });

  const key = new Uint8Array(32).fill(9);
  const crypto = new NodeCryptoProvider();

  const aNoise = new WhatsAppNoiseTransport(crypto);
  const bNoise = new WhatsAppNoiseTransport(crypto);

  aNoise.installCipher(new NoiseTransportCipher(crypto, key));
  bNoise.installCipher(new NoiseTransportCipher(crypto, key));

  const a = new WhatsAppProtocolTransport({
    wabinary,
    raw: aRaw,
    noise: aNoise,
  });

  const b = new WhatsAppProtocolTransport({
    wabinary,
    raw: bRaw,
    noise: bNoise,
  });

  return { a, b, aRaw, bRaw };
}

test("protocol transport round-trips an encrypted BinaryNode", async () => {
  const { a, b } = makeEncryptedPair();
  const received: any[] = [];

  b.setNodeHandlers({
    onNode: async (node) => {
      received.push(node);
    },
  });

  await Promise.all([a.connect(), b.connect()]);
  a.installEncryptedTransport();
  b.installEncryptedTransport();

  await a.sendNode(
    protocolNode(
      "message",
      { id: "1", to: "user@s.whatsapp.net" },
      { kind: "text", value: "hello" },
    ),
  );

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(received.length, 1);
  assert.equal(received[0].tag, "message");
  assert.equal(received[0].attrs.id, "1");
});

test("protocol transport rejects send before encryption", async () => {
  const { a } = makeEncryptedPair();
  await a.connect();

  await assert.rejects(() =>
    a.sendNode(protocolNode("message", { id: "1" })),
  );
});
