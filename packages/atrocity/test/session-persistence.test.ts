import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SignalSessionBinaryCodec, FileSignalSessionStore } from "../src/signal/index.js";

function record() {
  return {
    schemaVersion: 1 as const,
    sessionId: "test-session",
    createdAt: 1,
    updatedAt: 2,
    associatedData: new Uint8Array([1,2]),
    ratchet: {
      rootKey: { key: new Uint8Array(32).fill(1), generation: 2 },
      sendingChain: { key: new Uint8Array(32).fill(2), index: 3n },
      receiveCount: 4n,
      sendCount: 5n,
      previousSendingChainLength: 6n,
      skippedMessageKeyCount: 1,
      sendRatchetKey: {
        publicKey: new Uint8Array(32).fill(3),
        privateKey: new Uint8Array(32).fill(4),
      },
    },
    skippedMessageKeys: [{
      ratchetPublicKey: new Uint8Array(32).fill(5),
      messageNumber: 7n,
      messageKey: new Uint8Array(32).fill(6),
    }],
  };
}

test("session binary codec round-trips", () => {
  const codec = new SignalSessionBinaryCodec();
  const original = record();
  const decoded = codec.decode(codec.encode(original));

  assert.equal(decoded.schemaVersion, 1);
  assert.equal(decoded.sessionId, "test-session");
  assert.equal(decoded.ratchet.rootKey.generation, 2);
  assert.equal(decoded.ratchet.sendingChain?.index, 3n);
  assert.equal(decoded.skippedMessageKeys[0]?.messageNumber, 7n);
});

test("checksum detects corruption", () => {
  const codec = new SignalSessionBinaryCodec();
  const bytes = codec.encode(record());
  bytes[bytes.length - 1] ^= 0xff;

  assert.throws(() => codec.decode(bytes));
});

test("file store saves atomically and reloads", async () => {
  const directory = await mkdtemp(join(tmpdir(), "atrocity-session-"));
  try {
    const store = new FileSignalSessionStore(directory);
    const original = record();

    await store.save(original);
    const loaded = await store.load(original.sessionId);

    assert.equal(loaded?.sessionId, original.sessionId);
    assert.deepEqual(
      await store.list(),
      [original.sessionId],
    );

    await store.delete(original.sessionId);
    assert.equal(await store.load(original.sessionId), undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
