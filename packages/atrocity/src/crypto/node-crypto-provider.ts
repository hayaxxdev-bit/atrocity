import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  diffieHellman,
  generateKeyPairSync,
  randomBytes as nodeRandomBytes,
  createPublicKey,
  createPrivateKey,
  sign as nodeSign,
  verify as nodeVerify,
} from "node:crypto";
import { CryptoError } from "./crypto-errors.js";
import type {
  AeadAlgorithm,
  CryptoProvider,
  DhKeyPair,
  HashAlgorithm,
} from "./crypto-types.js";

const ZERO_SALT = new Uint8Array(0);
const HKDF_BLOCK_SIZE: Record<HashAlgorithm, number> = {
  "SHA-256": 32,
  "SHA-512": 64,
};

/**
 * Node.js crypto backend.
 *
 * No protocol semantics live here. This class provides primitives only.
 */
export class NodeCryptoProvider implements CryptoProvider {
  randomBytes(length: number): Uint8Array {
    validateLength(length);
    try {
      return new Uint8Array(nodeRandomBytes(length));
    } catch (error) {
      throw new CryptoError(
        "CRYPTO_OPERATION_FAILED",
        "Failed to generate secure random bytes.",
        { cause: error },
      );
    }
  }

  hash(algorithm: HashAlgorithm, data: Uint8Array): Uint8Array {
    try {
      const hash = createHash(normalizeHashName(algorithm));
      hash.update(data);
      return new Uint8Array(hash.digest());
    } catch (error) {
      throw new CryptoError(
        "CRYPTO_OPERATION_FAILED",
        `Hash operation failed for ${algorithm}.`,
        { cause: error },
      );
    }
  }

hkdf(
  algorithm: HashAlgorithm,
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Uint8Array {
  validateLength(length);
  const hashLength = HKDF_BLOCK_SIZE[algorithm];

  if (length > 255 * hashLength) {
    throw new CryptoError(
      "CRYPTO_INVALID_INPUT",
      `HKDF output exceeds the ${255 * hashLength}-byte limit.`,
    );
  }

  try {
    const effectiveSalt = salt.byteLength === 0
      ? new Uint8Array(hashLength)
      : salt;

    const prk = hmac(algorithm, effectiveSalt, ikm);
    const blocks: Uint8Array[] = [];
    let previous = new Uint8Array(0);
    const count = Math.ceil(length / hashLength);

    for (let counter = 1; counter <= count; counter += 1) {
      previous = hmac(
        algorithm,
        prk,
        concat(previous, info, new Uint8Array([counter])),
      );
      blocks.push(previous);
    }

    return concat(...blocks).slice(0, length);
  } catch (error) {
    if (error instanceof CryptoError) throw error;
    throw new CryptoError(
      "CRYPTO_OPERATION_FAILED",
      "HKDF operation failed.",
      { cause: error },
    );
  }
}

  generateX25519KeyPair(): DhKeyPair {
    try {
      const { publicKey, privateKey } = generateKeyPairSync("x25519");
      return Object.freeze({
        publicKey: new Uint8Array(
          publicKey.export({ format: "der", type: "spki" }).slice(-32),
        ),
        privateKey: new Uint8Array(
          privateKey.export({ format: "der", type: "pkcs8" }).slice(-32),
        ),
      });
    } catch (error) {
      throw new CryptoError(
        "CRYPTO_OPERATION_FAILED",
        "Failed to generate X25519 key pair.",
        { cause: error },
      );
    }
  }

  x25519(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    try {
      const privateDer = createPrivateKey({
        key: createX25519PrivateDer(privateKey),
        format: "der",
        type: "pkcs8",
      });

      const publicDer = createPublicKey({
        key: createX25519PublicDer(publicKey),
        format: "der",
        type: "spki",
      });

      return new Uint8Array(diffieHellman({
        privateKey: privateDer,
        publicKey: publicDer,
      }));
    } catch (error) {
      throw new CryptoError(
        "CRYPTO_INVALID_KEY",
        "X25519 operation failed for the provided key material.",
        { cause: error },
      );
    }
  }


generateEd25519KeyPair() {
  try {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    return Object.freeze({
      publicKey: new Uint8Array(
        publicKey.export({ format: "der", type: "spki" }).slice(-32),
      ),
      privateKey: new Uint8Array(
        privateKey.export({ format: "der", type: "pkcs8" }).slice(-32),
      ),
    });
  } catch (error) {
    throw new CryptoError(
      "CRYPTO_OPERATION_FAILED",
      "Failed to generate Ed25519 key pair.",
      { cause: error },
    );
  }
}

sign(algorithm, privateKey, message) {
  if (algorithm !== "Ed25519") {
    throw new CryptoError(
      "CRYPTO_INVALID_INPUT",
      `Unsupported signature algorithm: ${String(algorithm)}.`,
    );
  }
  if (privateKey.byteLength !== 32) {
    throw new CryptoError(
      "CRYPTO_INVALID_KEY",
      "Ed25519 private key must be 32 bytes.",
    );
  }

  try {
    const key = createPrivateKey({
      key: createEd25519PrivateDer(privateKey),
      format: "der",
      type: "pkcs8",
    });
    return new Uint8Array(nodeSign(null, message, key));
  } catch (error) {
    throw new CryptoError(
      "CRYPTO_OPERATION_FAILED",
      "Ed25519 signing failed.",
      { cause: error },
    );
  }
}

verify(algorithm, publicKey, message, signature) {
  if (algorithm !== "Ed25519") {
    throw new CryptoError(
      "CRYPTO_INVALID_INPUT",
      `Unsupported signature algorithm: ${String(algorithm)}.`,
    );
  }
  if (publicKey.byteLength !== 32) {
    throw new CryptoError(
      "CRYPTO_INVALID_KEY",
      "Ed25519 public key must be 32 bytes.",
    );
  }
  if (signature.byteLength !== 64) {
    throw new CryptoError(
      "CRYPTO_INVALID_INPUT",
      "Ed25519 signature must be 64 bytes.",
    );
  }

  try {
    const key = createPublicKey({
      key: createEd25519PublicDer(publicKey),
      format: "der",
      type: "spki",
    });
    return nodeVerify(null, message, key, signature);
  } catch (error) {
    throw new CryptoError(
      "CRYPTO_OPERATION_FAILED",
      "Ed25519 verification failed.",
      { cause: error },
    );
  }
}

  aeadEncrypt(
    algorithm: AeadAlgorithm,
    key: Uint8Array,
    nonce: Uint8Array,
    plaintext: Uint8Array,
    aad: Uint8Array = new Uint8Array(0),
  ) {
    if (algorithm !== "AES-256-GCM") {
      throw new CryptoError("CRYPTO_INVALID_INPUT", `Unsupported AEAD algorithm: ${algorithm}.`);
    }
    if (key.byteLength !== 32) {
      throw new CryptoError("CRYPTO_INVALID_KEY", "AES-256-GCM requires a 32-byte key.");
    }
    if (nonce.byteLength !== 12) {
      throw new CryptoError("CRYPTO_INVALID_INPUT", "AES-GCM nonce must be 12 bytes.");
    }

    try {
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      if (aad.byteLength > 0) cipher.setAAD(aad);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final(),
      ]);
      return Object.freeze({
        ciphertext: new Uint8Array(ciphertext),
        tag: new Uint8Array(cipher.getAuthTag()),
      });
    } catch (error) {
      throw new CryptoError(
        "CRYPTO_OPERATION_FAILED",
        "AES-256-GCM encryption failed.",
        { cause: error },
      );
    }
  }

  aeadDecrypt(
    algorithm: AeadAlgorithm,
    key: Uint8Array,
    nonce: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    aad: Uint8Array = new Uint8Array(0),
  ): Uint8Array {
    if (algorithm !== "AES-256-GCM") {
      throw new CryptoError("CRYPTO_INVALID_INPUT", `Unsupported AEAD algorithm: ${algorithm}.`);
    }
    if (key.byteLength !== 32) {
      throw new CryptoError("CRYPTO_INVALID_KEY", "AES-256-GCM requires a 32-byte key.");
    }
    if (nonce.byteLength !== 12) {
      throw new CryptoError("CRYPTO_INVALID_INPUT", "AES-GCM nonce must be 12 bytes.");
    }

    try {
      const decipher = createDecipheriv("aes-256-gcm", key, nonce);
      if (aad.byteLength > 0) decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return new Uint8Array(plaintext);
    } catch (error) {
      throw new CryptoError(
        "CRYPTO_AUTH_FAILED",
        "AES-256-GCM authentication failed.",
        { cause: error },
      );
    }
  }
}

function normalizeHashName(algorithm: HashAlgorithm): string {
  return algorithm.toLowerCase().replace("-", "");
}

function hmac(
  algorithm: HashAlgorithm,
  key: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  const mac = createHmac(normalizeHashName(algorithm), key);
  mac.update(data);
  return new Uint8Array(mac.digest());
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

function validateLength(length: number): void {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new CryptoError(
      "CRYPTO_INVALID_INPUT",
      `Invalid byte length: ${String(length)}.`,
    );
  }
}

function createX25519PrivateDer(raw: Uint8Array): Buffer {
  if (raw.byteLength !== 32) {
    throw new CryptoError("CRYPTO_INVALID_KEY", "X25519 private key must be 32 bytes.");
  }

  return Buffer.concat([
    Buffer.from("302e020100300506032b656e04220420", "hex"),
    Buffer.from(raw),
  ]);
}

function createX25519PublicDer(raw: Uint8Array): Buffer {
  if (raw.byteLength !== 32) {
    throw new CryptoError("CRYPTO_INVALID_KEY", "X25519 public key must be 32 bytes.");
  }

  return Buffer.concat([
    Buffer.from("302a300506032b656e032100", "hex"),
    Buffer.from(raw),
  ]);
}


function createEd25519PrivateDer(raw: Uint8Array): Buffer {
  if (raw.byteLength !== 32) {
    throw new CryptoError("CRYPTO_INVALID_KEY", "Ed25519 private key must be 32 bytes.");
  }
  return Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"),
    Buffer.from(raw),
  ]);
}

function createEd25519PublicDer(raw: Uint8Array): Buffer {
  if (raw.byteLength !== 32) {
    throw new CryptoError("CRYPTO_INVALID_KEY", "Ed25519 public key must be 32 bytes.");
  }
  return Buffer.concat([
    Buffer.from("302a300506032b6570032100", "hex"),
    Buffer.from(raw),
  ]);
}
