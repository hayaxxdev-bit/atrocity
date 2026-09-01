import assert from "node:assert/strict";
import test from "node:test";
import { NodeCryptoProvider } from "../src/crypto/index.js";
import {
  DoubleRatchetCore,
  RatchetChain,
  RatchetKdf,
  RootKeyStateMachine,
} from "../src/signal/index.js";

test("chain progression is deterministic", () => {
  const crypto = new NodeCryptoProvider();
  const kdf = new RatchetKdf(crypto);
  const initial = new Uint8Array(32).fill(7);
  const chain = new RatchetChain(crypto, initial);

  const derived = kdf.chain(initial, 0n);
  const first = chain.nextMessageKey();
  const second = chain.nextMessageKey();

  assert.deepEqual([...first.key], [...derived.messageKey]);
  assert.equal(first.index, 0n);
  assert.equal(second.index, 1n);
  assert.notDeepEqual([...first.key], [...second.key]);
});

test("root ratchet changes generation and returns a chain key", () => {
  const crypto = new NodeCryptoProvider();
  const root = new RootKeyStateMachine(
    crypto,
    new Uint8Array(32).fill(1),
  );
  const first = root.ratchet(new Uint8Array(32).fill(2));

  assert.equal(first.byteLength, 32);
  assert.equal(root.state.generation, 1);
  assert.notDeepEqual(
    [...root.state.key],
    new Uint8Array(32).fill(1),
  );
});

test("DoubleRatchetCore keeps send and receive counters independent", () => {
  const crypto = new NodeCryptoProvider();
  const core = new DoubleRatchetCore(
    crypto,
    new Uint8Array(32).fill(3),
    {
      sendingChainKey: new Uint8Array(32).fill(4),
      receivingChainKey: new Uint8Array(32).fill(5),
    },
  );

  const sent = core.nextSendingMessageKey();
  const received = core.nextReceivingMessageKey();

  assert.equal(sent.index, 0n);
  assert.equal(received.index, 0n);
  assert.equal(core.state.sendCount, 1n);
  assert.equal(core.state.receiveCount, 1n);
});

test("missing chains produce typed errors", () => {
  const crypto = new NodeCryptoProvider();
  const core = new DoubleRatchetCore(
    crypto,
    new Uint8Array(32).fill(3),
  );

  assert.throws(() => core.nextSendingMessageKey());
  assert.throws(() => core.nextReceivingMessageKey());
});
