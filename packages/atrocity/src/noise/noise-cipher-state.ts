import type { CryptoProvider } from "../crypto/index.js";
import { NoiseError } from "./noise-errors.js";

const MAX_NONCE = 0xffffffffffffffffn;

export class NoiseTransportCipher {
  private nonceValue = 0n;

  constructor(
    private readonly crypto: CryptoProvider,
    private readonly key?: Uint8Array,
  ) {
    if (key !== undefined && key.byteLength !== 32) {
      throw new NoiseError(
        "NOISE_CIPHER_FAILED",
        "AES-256-GCM Noise cipher requires a 32-byte key.",
      );
    }
  }

  get hasKey(): boolean {
    return this.key !== undefined;
  }

  get nonce(): bigint {
    return this.nonceValue;
  }

  /** @internal Test-vector helper; never part of the stable client API. */
  get __unsafeKeyForTests(): Uint8Array | undefined {
    return this.key?.slice();
  }

  encryptWithAd(ad: Uint8Array, plaintext: Uint8Array): Uint8Array {
    if (!this.key) return plaintext.slice();

    this.ensureNonceAvailable();
    const nonce = noiseNonceToAesGcm(this.nonceValue);
    const encrypted = this.crypto.aeadEncrypt(
      "AES-256-GCM",
      this.key,
      nonce,
      plaintext,
      ad,
    );

    this.nonceValue += 1n;
    return concat(encrypted.ciphertext, encrypted.tag);
  }

  decryptWithAd(ad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
    if (!this.key) return ciphertext.slice();
    if (ciphertext.byteLength < 16) {
      throw new NoiseError(
        "NOISE_CIPHER_FAILED",
        "Ciphertext is shorter than the authentication tag.",
      );
    }

    this.ensureNonceAvailable();
    const split = ciphertext.byteLength - 16;
    const body = ciphertext.slice(0, split);
    const tag = ciphertext.slice(split);

    // Do not increment until authenticated decryption succeeds.
    const plaintext = this.crypto.aeadDecrypt(
      "AES-256-GCM",
      this.key,
      noiseNonceToAesGcm(this.nonceValue),
      body,
      tag,
      ad,
    );

    this.nonceValue += 1n;
    return plaintext;
  }

  rekey(): void {
    throw new NoiseError(
      "NOISE_CIPHER_FAILED",
      "Generic rekey is not implemented until the target protocol profile defines its REKEY primitive.",
    );
  }

  private ensureNonceAvailable(): void {
    if (this.nonceValue === MAX_NONCE) {
      throw new NoiseError(
        "NOISE_CIPHER_FAILED",
        "Noise nonce is exhausted; the CipherState must be discarded.",
      );
    }
  }
}

function noiseNonceToAesGcm(nonce: bigint): Uint8Array {
  const output = new Uint8Array(12);
  let value = nonce;

  // Noise AESGCM nonce = 32 zero bits || big-endian 64-bit n.
  for (let i = 11; i >= 4; i -= 1) {
    output[i] = Number(value & 0xffn);
    value >>= 8n;
  }

  return output;
}

function concat(...values: Uint8Array[]): Uint8Array {
  const total = values.reduce((sum, value) => sum + value.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  for (const value of values) {
    output.set(value, offset);
    offset += value.byteLength;
  }

  return output;
}
