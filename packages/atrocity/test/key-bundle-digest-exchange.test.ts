import assert from "node:assert/strict";
import test from "node:test";
import {
  KeyBundleDigestExchange,
  createKeyBundleDigest,
} from "../src/signal/index.js";

function bundle() {
  return {
    identityKey: {
      publicKey: new Uint8Array(32).fill(1),
      privateKey: new Uint8Array(32).fill(2),
    },
    registrationId: 10,
    signedPreKey: {
      id: 1,
      publicKey: new Uint8Array(32).fill(3),
      privateKey: new Uint8Array(32).fill(4),
      signature: new Uint8Array(64).fill(5),
      generatedAt: 1,
    },
    preKeys: [{
      id: 2,
      publicKey: new Uint8Array(32).fill(6),
      privateKey: new Uint8Array(32).fill(7),
    }],
  };
}

test("digest query returns match when server digest equals local digest", async () => {
  const value = bundle();
  const digest = createKeyBundleDigest(value);

  const exchange = new KeyBundleDigestExchange({
    iq: {
      request: async (node) => {
        assert.equal(node.attrs.xmlns, "encrypt");
        assert.equal(node.content?.[0]?.tag, "digest");
        return {
          tag: "iq",
          attrs: {},
          content: [{
            tag: "digest",
            attrs: {},
            content: { kind: "binary", value: digest },
          }],
        };
      },
    },
    nextIqId: () => "q1",
  });

  const result = await exchange.query(value);
  assert.equal(result.status, "match");
});

test("digest mismatch is observable without mutating the bundle", async () => {
  const value = bundle();
  const before = JSON.stringify(value);

  const exchange = new KeyBundleDigestExchange({
    iq: {
      request: async () => ({
        tag: "iq",
        attrs: {},
        content: [{
          tag: "digest",
          attrs: {},
          content: { kind: "binary", value: new Uint8Array(32) },
        }],
      }),
    },
    nextIqId: () => "q2",
  });

  const result = await exchange.query(value);
  assert.equal(result.status, "mismatch");
  assert.equal(JSON.stringify(value), before);
});

test("missing digest produces repair-required", async () => {
  const value = bundle();

  const exchange = new KeyBundleDigestExchange({
    iq: {
      request: async () => ({
        tag: "iq",
        attrs: {},
        content: [],
      }),
    },
    nextIqId: () => "q3",
  });

  const result = await exchange.query(value);
  assert.equal(result.status, "repair-required");
});

test("invalid digest representation is rejected", async () => {
  const value = bundle();

  const exchange = new KeyBundleDigestExchange({
    iq: {
      request: async () => ({
        tag: "iq",
        attrs: {},
        content: [{
          tag: "digest",
          attrs: {},
          content: { kind: "text", value: "not-binary" },
        }],
      }),
    },
    nextIqId: () => "q4",
  });

  await assert.rejects(() => exchange.query(value));
});
