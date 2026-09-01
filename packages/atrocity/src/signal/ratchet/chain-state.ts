import type { CryptoProvider } from "../../crypto/index.js";
import { RatchetError } from "./ratchet-errors.js";
import type { ChainKeyState, MessageKey } from "./ratchet-types.js";
import { RatchetKdf } from "./kdf-ratchet.js";

const MAX_INDEX = 0xffffffffffffffffn;

export class RatchetChain {
  private stateValue: ChainKeyState;

  constructor(
    crypto: CryptoProvider,
    initialKey: Uint8Array,
    initialIndex = 0n,
  ) {
    if (initialKey.byteLength !== 32) {
      throw new RatchetError(
        "RATCHET_INVALID_KEY",
        "Chain key must be exactly 32 bytes.",
      );
    }
    if (initialIndex < 0n || initialIndex > MAX_INDEX) {
      throw new RatchetError(
        "RATCHET_INVALID_STATE",
        "Chain index is outside the valid range.",
      );
    }

    this.stateValue = Object.freeze({
      key: initialKey.slice(),
      index: initialIndex,
    });

    this.kdf = new RatchetKdf(crypto);
  }

  private readonly kdf: RatchetKdf;

  get state(): ChainKeyState {
    return Object.freeze({
      key: this.stateValue.key.slice(),
      index: this.stateValue.index,
    });
  }

  nextMessageKey(): MessageKey {
    if (this.stateValue.index === MAX_INDEX) {
      throw new RatchetError(
        "RATCHET_NONCE_EXHAUSTED",
        "Chain key index is exhausted.",
      );
    }

    const derived = this.kdf.chain(
      this.stateValue.key,
      this.stateValue.index,
    );

    const index = this.stateValue.index;
    this.stateValue = Object.freeze({
      key: derived.next.slice(),
      index: index + 1n,
    });

    return Object.freeze({
      key: derived.messageKey.slice(),
      index,
    });
  }
}
