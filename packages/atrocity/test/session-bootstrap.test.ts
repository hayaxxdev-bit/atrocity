import assert from "node:assert/strict";
import test from "node:test";
import {
  SessionBootstrap,
  type SignalSessionRecord,
} from "../src/signal/index.js";

function record(): SignalSessionRecord {
  return {
    schemaVersion: 1,
    sessionId: "s1",
    createdAt: 1,
    updatedAt: 2,
    associatedData: new Uint8Array(0),
    ratchet: {
      rootKey: {
        key: new Uint8Array(32).fill(1),
        generation: 0,
      },
      sendCount: 0n,
      receiveCount: 0n,
      previousSendingChainLength: 0n,
      skippedMessageKeyCount: 0,
    },
    skippedMessageKeys: [],
  };
}

function store(initial?: SignalSessionRecord) {
  let value = initial;
  return {
    load: async () => value,
    save: async (next: SignalSessionRecord) => {
      value = next;
    },
    delete: async () => {
      value = undefined;
    },
    list: async () => (value ? [value.sessionId] : []),
  };
}

const credentials = {
  device: {
    deviceId: new Uint8Array([1]),
    registrationId: 1,
    identityKeyPublic: new Uint8Array(32),
    identityKeyPrivate: new Uint8Array(32),
  },
  identitySigningKey: {
    publicKey: new Uint8Array(32),
    privateKey: new Uint8Array(32),
  },
  signedPreKey: {
    keyId: 1,
    publicKey: new Uint8Array(32),
    privateKey: new Uint8Array(32),
    signature: new Uint8Array(64),
    generatedAt: 1,
  },
  registrationId: 1,
};

const capabilities = {
  authentication: { name: "authentication", supported: true, metadata: {} },
  iq: { name: "iq", supported: true, metadata: {} },
  messaging: { name: "messaging", supported: true, metadata: {} },
  presence: { name: "presence", supported: true, metadata: {} },
  receipts: { name: "receipts", supported: true, metadata: {} },
  media: { name: "media", supported: false, metadata: {} },
  groups: { name: "groups", supported: false, metadata: {} },
  "history-sync": { name: "history-sync", supported: false, metadata: {} },
  "device-sync": { name: "device-sync", supported: false, metadata: {} },
  "contacts-sync": { name: "contacts-sync", supported: false, metadata: {} },
  experimental: { name: "experimental", supported: false, metadata: {} },
} as any;

test("restore existing session into active context", async () => {
  const bootstrap = new SessionBootstrap({
    loadCredentials: async () => credentials,
    sessionStore: store(record()),
    capabilities,
    requiredCapabilities: ["iq", "messaging"],
  });

  const result = await bootstrap.restore("s1");

  assert.equal(result.state, "active");
  assert.equal(result.created, false);
  assert.equal(result.active?.sessionId, "s1");
  assert.equal(bootstrap.state, "active");
});

test("missing session remains no-session", async () => {
  const bootstrap = new SessionBootstrap({
    loadCredentials: async () => credentials,
    sessionStore: store(),
    capabilities,
  });

  const result = await bootstrap.restore("missing");

  assert.equal(result.state, "no-session");
  assert.equal(result.created, false);
});

test("required capability mismatch marks session incompatible", async () => {
  const bootstrap = new SessionBootstrap({
    loadCredentials: async () => credentials,
    sessionStore: store(record()),
    capabilities,
    requiredCapabilities: ["groups"],
  });

  await assert.rejects(() => bootstrap.restore("s1"));
  assert.equal(bootstrap.state, "incompatible");
});

test("create persists a new session and activates it", async () => {
  const memory = store();
  const bootstrap = new SessionBootstrap({
    loadCredentials: async () => credentials,
    sessionStore: memory,
    capabilities,
    requiredCapabilities: ["iq"],
  });

  const result = await bootstrap.create("new-session", () => ({
    ...record(),
    sessionId: "new-session",
  }));

  assert.equal(result.state, "active");
  assert.equal(result.created, true);
  assert.equal((await memory.load("new-session"))?.sessionId, "new-session");
});
