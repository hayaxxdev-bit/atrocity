import type { CryptoProvider } from "../../crypto/index.js";
import { RatchetError } from "./ratchet-errors.js";

export type ChainKeyResult = {
  readonly next: Uint8Array;
  readonly messageKey: Uint8Array;
};

export type RootKdfResult = {
  readonly rootKey: Uint8Array;
  readonly chainKey: Uint8Array;
};

/**
 * Double Ratchet KDF helpers.
 *
 * These functions deliberately keep protocol labels explicit. The exact
 * production Signal constants can be selected by a profile later.
 */
export class RatchetKdf {
  constructor(private readonly crypto: CryptoProvider) {}

  chain(
    chainKey: Uint8Array,
    index: bigint,
  ): ChainKeyResult {
    require32(chainKey, "chainKey");
    requireCounter(index);

    try {
      const next = this.crypto.hmac("SHA-256", chainKey, new Uint8Array([0x02]));
      const messageKey = this.crypto.hmac(
        "SHA-256",
        chainKey,
        new Uint8Array([0x01]),
      );

      return Object.freeze({
        next,
        messageKey,
      });
    } catch (error) {
      throw new RatchetError(
        "RATCHET_DERIVATION_FAILED",
        "Failed to derive chain/message keys.",
        { cause: error },
      );
    }
  }

  root(
    rootKey: Uint8Array,
    dhOutput: Uint8Array,
  ): RootKdfResult {
    require32(rootKey, "rootKey");
    if (dhOutput.byteLength === 0) {
      throw new RatchetError(
        "RATCHET_INVALID_KEY",
        "DH output must not be empty.",
      );
    }

    try {
      const material = this.crypto.hkdf(
        "SHA-256",
        dhOutput,
        rootKey,
        new TextEncoder().encode("Signal_Ratchet_Root_KDF"),
        64,
      );

      return Object.freeze({
        rootKey: material.slice(0, 32),
        chainKey: material.slice(32, 64),
      });
    } catch (error) {
      throw new RatchetError(
        "RATCHET_DERIVATION_FAILED",
        "Failed to derive root and chain keys.",
        { cause: error },
      );
    }
  }
}

function require32(value: Uint8Array, name: string): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new RatchetError(
      "RATCHET_INVALID_KEY",
      `${name} must be exactly 32 bytes.`,
    );
  }
}

function requireCounter(value: bigint): void {
  if (value < 0n || value >= 0xffffffffffffffffn) {
    throw new RatchetError(
      "RATCHET_NONCE_EXHAUSTED",
      "Ratchet counter is exhausted or invalid.",
    );
  }
}
