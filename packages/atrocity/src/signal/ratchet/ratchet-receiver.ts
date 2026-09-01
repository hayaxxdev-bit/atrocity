import type { CryptoProvider } from "../../crypto/index.js";
import { RatchetError } from "./ratchet-errors.js";
import { RatchetChain } from "./chain-state.js";
import { DHRatchet, type RatchetMessageHeader } from "./dh-ratchet.js";
import {
  SkippedMessageKeyStore,
  type SkippedKeyStoreSnapshot,
} from "./skipped-key-store.js";
import { skipMessageKeys, trySkippedMessageKey } from "./message-key-skipping.js";
import type { DoubleRatchetState, MessageKey } from "./ratchet-types.js";

export class RatchetReceiver {
  private readonly skipped = new SkippedMessageKeyStore();
  private receivingChain?: RatchetChain;
  private remoteRatchetPublicKey?: Uint8Array;

  constructor(
    private readonly crypto: CryptoProvider,
    private readonly ratchet: DHRatchet,
  ) {}

  get skippedKeyCount(): number {
    return this.skipped.size;
  }

  get skippedKeyStoreSnapshot(): SkippedKeyStoreSnapshot {
    return this.skipped.snapshot();
  }

  installReceivingChain(chainKey: Uint8Array): void {
    this.receivingChain = new RatchetChain(this.crypto, chainKey);
  }

  receiveKey(header: RatchetMessageHeader): MessageKey {
    const skipped = trySkippedMessageKey(
      this.skipped,
      header.dh,
      header.n,
    );
    if (skipped) {
      return Object.freeze({ key: skipped, index: header.n });
    }

    return this.deriveCurrentKey(header);
  }

  /**
   * Atomic receive transaction:
   * all key derivation and optional decryption callback run against a
   * snapshot. State and skipped keys commit only if `decrypt` succeeds.
   */
  receiveAndDecrypt(
    header: RatchetMessageHeader,
    decrypt: (messageKey: Uint8Array) => Uint8Array,
  ): Uint8Array {
    validateHeader(header);

    const ratchetSnapshot = this.ratchet.createSnapshot();
    const chainSnapshot = this.receivingChain
      ? this.receivingChain.state
      : undefined;
    const remoteSnapshot = this.remoteRatchetPublicKey?.slice();
    const skippedSnapshot = this.skipped.snapshot();

    try {
      const messageKey = this.deriveCurrentKey(header);
      const plaintext = decrypt(messageKey.key.slice());

      // Only here is mutation committed.
      return plaintext;
    } catch (error) {
      this.ratchet.restoreState(ratchetSnapshot);
      this.receivingChain = chainSnapshot
        ? new RatchetChain(
            this.crypto,
            chainSnapshot.key,
            chainSnapshot.index,
          )
        : undefined;
      this.remoteRatchetPublicKey = remoteSnapshot;
      this.skipped.restore(skippedSnapshot);
      throw error;
    }
  }

  private deriveCurrentKey(header: RatchetMessageHeader): MessageKey {
    const skipped = trySkippedMessageKey(
      this.skipped,
      header.dh,
      header.n,
    );
    if (skipped) {
      return Object.freeze({
        key: skipped,
        index: header.n,
      });
    }

    if (
      !this.remoteRatchetPublicKey ||
      !equalBytes(this.remoteRatchetPublicKey, header.dh)
    ) {
      if (this.receivingChain && this.remoteRatchetPublicKey) {
        skipMessageKeys(
          this.receivingChain,
          this.skipped,
          {
            remoteRatchetPublicKey: this.remoteRatchetPublicKey,
            currentReceiveNumber: this.ratchet.state.receiveCount,
          },
          header.pn,
        );
      }

      const transition = this.ratchet.receiveNewRatchetKey(header.dh);
      this.remoteRatchetPublicKey = header.dh.slice();
      this.installReceivingChain(transition.receivingChainKey);
    }

    if (!this.receivingChain) {
      throw new RatchetError(
        "RATCHET_MESSAGE_KEY_UNAVAILABLE",
        "No receiving chain is available.",
      );
    }

    skipMessageKeys(
      this.receivingChain,
      this.skipped,
      {
        remoteRatchetPublicKey: this.remoteRatchetPublicKey!,
        currentReceiveNumber: this.ratchet.state.receiveCount,
      },
      header.n,
    );

    const key = this.receivingChain.nextMessageKey();
    return Object.freeze({
      key: key.key.slice(),
      index: key.index,
    });
  }
}

function validateHeader(header: RatchetMessageHeader): void {
  if (!(header.dh instanceof Uint8Array) || header.dh.byteLength !== 32) {
    throw new RatchetError(
      "RATCHET_INVALID_KEY",
      "Message header DH public key must be exactly 32 bytes.",
    );
  }
  if (header.pn < 0n || header.n < 0n) {
    throw new RatchetError(
      "RATCHET_INVALID_STATE",
      "Message header counters cannot be negative.",
    );
  }
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let difference = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    difference |= a[i]! ^ b[i]!;
  }
  return difference === 0;
}
