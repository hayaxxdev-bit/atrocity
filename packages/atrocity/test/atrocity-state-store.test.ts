import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import { CredentialGenerator } from "../src/auth/index.js";
import { AtrocityStateStore, CredentialBinaryCodec } from "../src/auth/index.js";

test("credential codec round-trips generated credentials", () => {
  const crypto = new NodeCryptoProvider();
  const credentials = new CredentialGenerator(crypto).generate();
  const codec = new CredentialBinaryCodec();

  const record = {
    schemaVersion: 1 as const,
    credentials,
    updatedAt: 1234,
  };

  const decoded = codec.decode(codec.encode(record));
  assert.equal(decoded.updatedAt, 1234);
  assert.equal(
    decoded.credentials.device.registrationId,
    credentials.device.registrationId,
  );
  assert.equal(
    decoded.credentials.signedPreKey.signature.length,
    64,
  );
});

test("aggregate store persists credentials and sessions separately", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atrocity-state-"));

  try {
    const crypto = new NodeCryptoProvider();
    const credentials = new CredentialGenerator(crypto).generate();

    const store = new AtrocityStateStore({ directory });

    await store.saveCredentials(credentials);
    const loadedCredentials = await store.loadCredentials();

    assert.equal(
      loadedCredentials?.device.registrationId,
      credentials.device.registrationId,
    );

    const session = {
      schemaVersion: 1 as const,
      sessionId: "session-1",
      createdAt: 1,
      updatedAt: 2,
      associatedData: new Uint8Array([1, 2]),
      ratchet: {
        rootKey: {
          key: new Uint8Array(32).fill(1),
          generation: 0,
        },
        sendCount: 0n,
        receiveCount: 0n,
        previousSendingChainLength: 0n,
        skippedMessageKeyCount: 0,
        sendRatchetKey: {
          publicKey: new Uint8Array(32).fill(2),
          privateKey: new Uint8Array(32).fill(3),
        },
      },
      skippedMessageKeys: [],
    };

    await store.saveSession(session);
    const loadedSession = await store.loadSession("session-1");

    assert.equal(loadedSession?.sessionId, "session-1");
    assert.equal(loadedSession?.ratchet.rootKey.generation, 0);

    await store.deleteSession("session-1");
    assert.equal(await store.loadSession("session-1"), undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("store serializes concurrent credential writes through one mutation queue", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atrocity-state-"));

  try {
    const crypto = new NodeCryptoProvider();
    const generator = new CredentialGenerator(crypto);
    const a = generator.generate();
    const b = generator.generate();

    const store = new AtrocityStateStore({ directory });

    await Promise.all([
      store.saveCredentials(a),
      store.saveCredentials(b),
    ]);

    const finalCredentials = await store.loadCredentials();
    assert.ok(finalCredentials);
    assert.ok(
      finalCredentials!.device.registrationId === a.device.registrationId ||
      finalCredentials!.device.registrationId === b.device.registrationId,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
