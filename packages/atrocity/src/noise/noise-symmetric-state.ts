import type { CryptoProvider, HashAlgorithm } from "../crypto/index.js";
import { NoiseError } from "./noise-errors.js";
import { NoiseTransportCipher } from "./noise-cipher-state.js";

type SplitCipherStates = readonly [
  NoiseTransportCipher,
  NoiseTransportCipher,
];

export class NoiseSymmetricState {
  private readonly hashLength: number;
  private chainingKeyValue: Uint8Array;
  private handshakeHashValue: Uint8Array;
  private cipherState: NoiseTransportCipher;
  private splitDone = false;

  constructor(
    private readonly crypto: CryptoProvider,
    private readonly hash: HashAlgorithm,
    protocolName: Uint8Array,
  ) {
    this.hashLength = hash === "SHA-256" ? 32 : 64;

    // Noise InitializeSymmetric:
    // if protocol_name <= HASHLEN, pad with zeros; otherwise hash it.
    if (protocolName.byteLength <= this.hashLength) {
      this.handshakeHashValue = new Uint8Array(this.hashLength);
      this.handshakeHashValue.set(protocolName);
    } else {
      this.handshakeHashValue = crypto.hash(hash, protocolName);
    }

    this.chainingKeyValue = this.handshakeHashValue.slice();
    this.cipherState = new NoiseTransportCipher(crypto);
  }

  get handshakeHash(): Uint8Array {
    return this.handshakeHashValue.slice();
  }

  get chainingKey(): Uint8Array {
    return this.chainingKeyValue.slice();
  }

  get hasCipherKey(): boolean {
    return this.cipherState.hasKey;
  }

  mixHash(data: Uint8Array): void {
    this.requireHandshakePhase();
    this.handshakeHashValue = this.crypto.hash(
      this.hash,
      concat(this.handshakeHashValue, data),
    );
  }

  mixKey(inputKeyMaterial: Uint8Array): void {
    this.requireHandshakePhase();
    const [ck, tempK] = hkdf2(
      this.crypto,
      this.hash,
      this.chainingKeyValue,
      inputKeyMaterial,
      this.hashLength,
    );

    this.chainingKeyValue = ck;
    this.cipherState = new NoiseTransportCipher(
      this.crypto,
      this.hashLength === 64 ? tempK.slice(0, 32) : tempK,
    );
  }

  mixKeyAndHash(inputKeyMaterial: Uint8Array): void {
    this.requireHandshakePhase();

    const [ck, tempH, tempK] = hkdf3(
      this.crypto,
      this.hash,
      this.chainingKeyValue,
      inputKeyMaterial,
      this.hashLength,
    );

    this.chainingKeyValue = ck;
    this.mixHash(tempH);
    this.cipherState = new NoiseTransportCipher(
      this.crypto,
      this.hashLength === 64 ? tempK.slice(0, 32) : tempK,
    );
  }

  encryptAndHash(plaintext: Uint8Array): Uint8Array {
    this.requireHandshakePhase();
    const ciphertext = this.cipherState.encryptWithAd(
      this.handshakeHashValue,
      plaintext,
    );
    this.mixHash(ciphertext);
    return ciphertext;
  }

  decryptAndHash(ciphertext: Uint8Array): Uint8Array {
    this.requireHandshakePhase();
    const plaintext = this.cipherState.decryptWithAd(
      this.handshakeHashValue,
      ciphertext,
    );
    this.mixHash(ciphertext);
    return plaintext;
  }

  split(): SplitCipherStates {
    if (this.splitDone) {
      throw new NoiseError(
        "NOISE_ALREADY_COMPLETE",
        "Noise symmetric state has already been split.",
      );
    }

    const [tempK1, tempK2] = hkdf2(
      this.crypto,
      this.hash,
      this.chainingKeyValue,
      new Uint8Array(0),
      this.hashLength,
    );

    const key1 = this.hashLength === 64 ? tempK1.slice(0, 32) : tempK1;
    const key2 = this.hashLength === 64 ? tempK2.slice(0, 32) : tempK2;

    this.splitDone = true;

    return [
      new NoiseTransportCipher(this.crypto, key1),
      new NoiseTransportCipher(this.crypto, key2),
    ] as const;
  }

  private requireHandshakePhase(): void {
    if (this.splitDone) {
      throw new NoiseError(
        "NOISE_INVALID_STATE",
        "Handshake symmetric state is unavailable after Split().",
      );
    }
  }
}

function hkdf2(
  crypto: CryptoProvider,
  hash: HashAlgorithm,
  salt: Uint8Array,
  ikm: Uint8Array,
  hashLength: number,
): readonly [Uint8Array, Uint8Array] {
  const output = crypto.hkdf(
    hash,
    ikm,
    salt,
    new Uint8Array(0),
    hashLength * 2,
  );

  return [
    output.slice(0, hashLength),
    output.slice(hashLength, hashLength * 2),
  ];
}

function hkdf3(
  crypto: CryptoProvider,
  hash: HashAlgorithm,
  salt: Uint8Array,
  ikm: Uint8Array,
  hashLength: number,
): readonly [Uint8Array, Uint8Array, Uint8Array] {
  const output = crypto.hkdf(
    hash,
    ikm,
    salt,
    new Uint8Array(0),
    hashLength * 3,
  );

  return [
    output.slice(0, hashLength),
    output.slice(hashLength, hashLength * 2),
    output.slice(hashLength * 2, hashLength * 3),
  ];
}

function concat(...values: Uint8Array[]): Uint8Array {
  const size = values.reduce((sum, value) => sum + value.byteLength, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  for (const value of values) {
    output.set(value, offset);
    offset += value.byteLength;
  }

  return output;
}
