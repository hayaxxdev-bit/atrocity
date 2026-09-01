import { RatchetError } from "./ratchet-errors.js";
import { RatchetChain } from "./chain-state.js";
import { SkippedMessageKeyStore } from "./skipped-key-store.js";

export type SkipContext = {
  readonly remoteRatchetPublicKey: Uint8Array;
  readonly currentReceiveNumber: bigint;
};

/**
 * Advances a receiving chain up to `until`, storing every skipped message
 * key in MKSKIPPED. No more than MAX_SKIP keys may be generated in one
 * operation.
 */
export function skipMessageKeys(
  chain: RatchetChain | undefined,
  store: SkippedMessageKeyStore,
  context: SkipContext,
  until: bigint,
  maxSkip: bigint = 200n,
): void {
  if (until < context.currentReceiveNumber) {
    throw new RatchetError(
      "RATCHET_INVALID_STATE",
      "Cannot skip backwards in a receive chain.",
    );
  }

  const distance = until - context.currentReceiveNumber;
  if (distance > maxSkip) {
    throw new RatchetError(
      "RATCHET_MESSAGE_KEY_UNAVAILABLE",
      `Requested skip of ${distance.toString()} exceeds MAX_SKIP ${maxSkip.toString()}.`,
    );
  }

  if (!chain) {
    if (distance === 0n) return;
    throw new RatchetError(
      "RATCHET_MESSAGE_KEY_UNAVAILABLE",
      "Receiving chain is unavailable for skipped-message processing.",
    );
  }

  for (let i = 0n; i < distance; i += 1n) {
    const derived = chain.nextMessageKey();
    store.put(
      context.remoteRatchetPublicKey,
      derived.index,
      derived.key,
    );
  }
}

export function trySkippedMessageKey(
  store: SkippedMessageKeyStore,
  ratchetPublicKey: Uint8Array,
  messageNumber: bigint,
): Uint8Array | undefined {
  return store.take(ratchetPublicKey, messageNumber);
}
