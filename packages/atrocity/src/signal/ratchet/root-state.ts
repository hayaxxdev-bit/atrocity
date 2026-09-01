import type { CryptoProvider } from "../../crypto/index.js";
import { RatchetError } from "./ratchet-errors.js";
import { RatchetKdf } from "./kdf-ratchet.js";
import type { RootKeyState } from "./ratchet-types.js";

export class RootKeyStateMachine {
  private value: RootKeyState;
  private readonly kdf: RatchetKdf;

  constructor(
    crypto: CryptoProvider,
    initialRootKey: Uint8Array,
    generation = 0,
  ) {
    if (initialRootKey.byteLength !== 32) {
      throw new RatchetError(
        "RATCHET_INVALID_KEY",
        "Root key must be exactly 32 bytes.",
      );
    }
    if (!Number.isSafeInteger(generation) || generation < 0) {
      throw new RatchetError(
        "RATCHET_INVALID_STATE",
        "Root key generation is invalid.",
      );
    }

    this.kdf = new RatchetKdf(crypto);
    this.value = Object.freeze({
      key: initialRootKey.slice(),
      generation,
    });
  }

  get state(): RootKeyState {
    return Object.freeze({
      key: this.value.key.slice(),
      generation: this.value.generation,
    });
  }

  ratchet(dhOutput: Uint8Array): Uint8Array {
    const result = this.kdf.root(
      this.value.key,
      dhOutput,
    );

    this.value = Object.freeze({
      key: result.rootKey.slice(),
      generation: this.value.generation + 1,
    });

    return result.chainKey.slice();
  }
}
