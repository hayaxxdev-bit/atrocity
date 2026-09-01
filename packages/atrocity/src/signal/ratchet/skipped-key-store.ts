import { RatchetError } from "./ratchet-errors.js";

export type SkippedKeyRef = {
  readonly ratchetPublicKey: Uint8Array;
  readonly messageNumber: bigint;
};

export type SkippedMessageKey = SkippedKeyRef & {
  readonly messageKey: Uint8Array;
};

export type SkippedKeyStoreLimits = {
  readonly maxTotalKeys: number;
  readonly maxPerChain: number;
};

export type SkippedKeyStoreSnapshot = {
  readonly entries: readonly SkippedMessageKey[];
};

export const DEFAULT_SKIPPED_KEY_LIMITS: SkippedKeyStoreLimits = Object.freeze({
  maxTotalKeys: 1000,
  maxPerChain: 200,
});

export class SkippedMessageKeyStore {
  private readonly entries = new Map<string, SkippedMessageKey>();
  private readonly perChain = new Map<string, number>();

  constructor(
    private readonly limits: SkippedKeyStoreLimits = DEFAULT_SKIPPED_KEY_LIMITS,
  ) {
    validateLimits(limits);
  }

  get size(): number {
    return this.entries.size;
  }

  put(
    ratchetPublicKey: Uint8Array,
    messageNumber: bigint,
    messageKey: Uint8Array,
  ): void {
    validateRatchetKey(ratchetPublicKey);
    validateMessageKey(messageKey);
    validateMessageNumber(messageNumber);

    const chainId = toHex(ratchetPublicKey);
    const id = makeId(chainId, messageNumber);

    if (this.entries.has(id)) {
      throw new RatchetError(
        "RATCHET_INVALID_STATE",
        `Skipped message key ${messageNumber.toString()} already exists for this ratchet key.`,
      );
    }

    const chainCount = this.perChain.get(chainId) ?? 0;
    if (chainCount >= this.limits.maxPerChain) {
      throw new RatchetError(
        "RATCHET_MESSAGE_KEY_UNAVAILABLE",
        "Per-chain skipped-message-key limit exceeded.",
      );
    }

    if (this.entries.size >= this.limits.maxTotalKeys) {
      throw new RatchetError(
        "RATCHET_MESSAGE_KEY_UNAVAILABLE",
        "Total skipped-message-key limit exceeded.",
      );
    }

    this.entries.set(id, Object.freeze({
      ratchetPublicKey: ratchetPublicKey.slice(),
      messageNumber,
      messageKey: messageKey.slice(),
    }));
    this.perChain.set(chainId, chainCount + 1);
  }

  take(
    ratchetPublicKey: Uint8Array,
    messageNumber: bigint,
  ): Uint8Array | undefined {
    validateRatchetKey(ratchetPublicKey);
    validateMessageNumber(messageNumber);

    const chainId = toHex(ratchetPublicKey);
    const id = makeId(chainId, messageNumber);
    const entry = this.entries.get(id);
    if (!entry) return undefined;

    this.entries.delete(id);
    this.decrementChain(chainId);
    return entry.messageKey.slice();
  }

  has(
    ratchetPublicKey: Uint8Array,
    messageNumber: bigint,
  ): boolean {
    validateRatchetKey(ratchetPublicKey);
    validateMessageNumber(messageNumber);
    return this.entries.has(
      makeId(toHex(ratchetPublicKey), messageNumber),
    );
  }

  snapshot(): SkippedKeyStoreSnapshot {
    return Object.freeze({
      entries: Object.freeze(
        [...this.entries.values()].map((entry) => Object.freeze({
          ratchetPublicKey: entry.ratchetPublicKey.slice(),
          messageNumber: entry.messageNumber,
          messageKey: entry.messageKey.slice(),
        })),
      ),
    });
  }

  restore(snapshot: SkippedKeyStoreSnapshot): void {
    this.clear();

    for (const entry of snapshot.entries) {
      this.put(
        entry.ratchetPublicKey,
        entry.messageNumber,
        entry.messageKey,
      );
    }
  }

  clear(): void {
    this.entries.clear();
    this.perChain.clear();
  }

  private decrementChain(chainId: string): void {
    const count = this.perChain.get(chainId) ?? 1;
    if (count <= 1) {
      this.perChain.delete(chainId);
    } else {
      this.perChain.set(chainId, count - 1);
    }
  }
}

function makeId(chainId: string, messageNumber: bigint): string {
  return `${chainId}:${messageNumber.toString()}`;
}

function toHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
  return output;
}

function validateRatchetKey(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new RatchetError(
      "RATCHET_INVALID_KEY",
      "Ratchet public key must be exactly 32 bytes.",
    );
  }
}

function validateMessageKey(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new RatchetError(
      "RATCHET_INVALID_KEY",
      "Message key must be exactly 32 bytes.",
    );
  }
}

function validateMessageNumber(value: bigint): void {
  if (value < 0n || value > 0xffffffffffffffffn) {
    throw new RatchetError(
      "RATCHET_INVALID_STATE",
      "Message number is outside the supported range.",
    );
  }
}

function validateLimits(limits: SkippedKeyStoreLimits): void {
  if (
    !Number.isSafeInteger(limits.maxTotalKeys) ||
    !Number.isSafeInteger(limits.maxPerChain) ||
    limits.maxTotalKeys <= 0 ||
    limits.maxPerChain <= 0 ||
    limits.maxPerChain > limits.maxTotalKeys
  ) {
    throw new RangeError("Invalid skipped-key limits.");
  }
}
