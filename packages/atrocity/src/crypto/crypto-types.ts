export type Bytes = Uint8Array;

export type HashAlgorithm =
  | "SHA-256"
  | "SHA-512";

export type AeadAlgorithm = "AES-256-GCM";

export type SignatureAlgorithm = "Ed25519";

export type SigningKeyPair = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type DhKeyPair = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type AeadCiphertext = {
  readonly ciphertext: Uint8Array;
  readonly tag: Uint8Array;
};

export type CryptoProvider = {
  randomBytes(length: number): Uint8Array;
  hash(algorithm: HashAlgorithm, data: Uint8Array): Uint8Array;
  hmac(
    algorithm: HashAlgorithm,
    key: Uint8Array,
    data: Uint8Array,
  ): Uint8Array;
  hkdf(
    hash: HashAlgorithm,
    ikm: Uint8Array,
    salt: Uint8Array,
    info: Uint8Array,
    length: number,
  ): Uint8Array;

  generateX25519KeyPair(): DhKeyPair;
  x25519(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array;

  generateEd25519KeyPair(): SigningKeyPair;
  sign(
    algorithm: SignatureAlgorithm,
    privateKey: Uint8Array,
    message: Uint8Array,
  ): Uint8Array;
  verify(
    algorithm: SignatureAlgorithm,
    publicKey: Uint8Array,
    message: Uint8Array,
    signature: Uint8Array,
  ): boolean;

  aeadEncrypt(
    algorithm: AeadAlgorithm,
    key: Uint8Array,
    nonce: Uint8Array,
    plaintext: Uint8Array,
    aad?: Uint8Array,
  ): AeadCiphertext;

  aeadDecrypt(
    algorithm: AeadAlgorithm,
    key: Uint8Array,
    nonce: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    aad?: Uint8Array,
  ): Uint8Array;
};
