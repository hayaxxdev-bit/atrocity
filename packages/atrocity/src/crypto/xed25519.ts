import { ed25519 } from "@noble/curves/ed25519.js";
import { CryptoError } from "./crypto-errors.js";

const P = 2n ** 255n - 19n;
const Q =
  2n ** 252n +
  27742317777372353535851937790883648493n;
const D =
  (-121665n * modInv(121666n, P)) % P;

export type XEd25519Key = {
  readonly x25519PrivateKey: Uint8Array;
  readonly x25519PublicKey: Uint8Array;
};

export function x25519PrivateToXEd25519(
  x25519PrivateKey: Uint8Array,
): XEd25519Key {
  if (x25519PrivateKey.byteLength !== 32) {
    throw new CryptoError(
      "CRYPTO_INVALID_KEY",
      "X25519 private key must be exactly 32 bytes.",
    );
  }

  const k = littleEndianToBigInt(x25519PrivateKey);
  if (k <= 0n || k >= Q) {
    throw new CryptoError(
      "CRYPTO_INVALID_KEY",
      "X25519 private scalar must be in the Curve25519 scalar range.",
    );
  }

  const publicKey = x25519PublicFromPrivate(x25519PrivateKey);

  // XEdDSA calculate_key_pair(k):
  // E = kB; A.y = E.y; A.s = 0; if E.s == 1, a = -k (mod q).
  const E = ed25519.Point.BASE.multiply(k);
  const affine = E.toAffine();
  const signBit = affine.x & 1n;
  const a = signBit === 1n ? mod(Q - k, Q) : k;

  const edPublic = encodeEdwardsPoint(affine.y, 0);

  return Object.freeze({
    x25519PrivateKey: x25519PrivateKey.slice(),
    x25519PublicKey: publicKey,
  });
}

export class XEd25519Signer {
  constructor(
    private readonly randomBytes: (length: number) => Uint8Array,
    private readonly sha512: (data: Uint8Array) => Uint8Array,
  ) {}

  sign(
    x25519PrivateKey: Uint8Array,
    message: Uint8Array,
  ): Uint8Array {
    const { publicKey: A, scalar: a } =
      calculateSigningKey(x25519PrivateKey);

    const Z = this.randomBytes(64);
    const r = hashToScalar(
      this.sha512,
      concat(
        domainPrefix(1),
        bigIntToLittleEndian(a, 32),
        message,
        Z,
      ),
    );

    const R = ed25519.Point.BASE.multiply(r).toBytes();
    const h = hashToScalar(
      this.sha512,
      concat(R, A, message),
    );

    const s = mod(r + h * a, Q);

    return concat(
      R,
      bigIntToLittleEndian(s, 32),
    );
  }

  verify(
    x25519PublicKey: Uint8Array,
    message: Uint8Array,
    signature: Uint8Array,
  ): boolean {
    if (
      x25519PublicKey.byteLength !== 32 ||
      signature.byteLength !== 64
    ) {
      return false;
    }

    try {
      const A = convertMontgomeryPublicToEdwards(x25519PublicKey);
      const RBytes = signature.slice(0, 32);
      const sBytes = signature.slice(32);
      const s = littleEndianToBigInt(sBytes);

      // XEdDSA rejects s with excess bits.
      if (s >= 2n ** 253n) return false;

      const R = ed25519.Point.fromBytes(RBytes);
      const h = hashToScalar(
        this.sha512,
        concat(RBytes, A.toBytes(), message),
      );

      const check = ed25519.Point.BASE
        .multiply(s)
        .subtract(A.multiply(h));

      return equalBytes(check.toBytes(), R.toBytes());
    } catch {
      return false;
    }
  }
}

function calculateSigningKey(
  privateKey: Uint8Array,
): {
  readonly publicKey: Uint8Array;
  readonly scalar: bigint;
} {
  if (privateKey.byteLength !== 32) {
    throw new CryptoError(
      "CRYPTO_INVALID_KEY",
      "XEd25519 private key must be exactly 32 bytes.",
    );
  }

  const k = littleEndianToBigInt(privateKey);
  if (k <= 0n || k >= Q) {
    throw new CryptoError(
      "CRYPTO_INVALID_KEY",
      "XEd25519 private scalar is outside the scalar range.",
    );
  }

  const E = ed25519.Point.BASE.multiply(k);
  const affine = E.toAffine();
  const signBit = affine.x & 1n;
  const scalar =
    signBit === 1n ? mod(Q - k, Q) : k;

  return {
    publicKey: encodeEdwardsPoint(affine.y, 0),
    scalar,
  };
}

function convertMontgomeryPublicToEdwards(
  uBytes: Uint8Array,
) {
  const u = littleEndianToBigInt(uBytes);
  if (u >= P) {
    throw new Error("Montgomery u-coordinate is out of range.");
  }

  const denominator = mod(u + 1n, P);
  if (denominator === 0n) {
    throw new Error("Invalid Montgomery u-coordinate.");
  }

  const y = mod(
    mod(u - 1n, P) * modInv(denominator, P),
    P,
  );

  const encoded = encodeEdwardsPoint(y, 0);
  return ed25519.Point.fromBytes(encoded);
}

function encodeEdwardsPoint(
  y: bigint,
  signBit: bigint | number,
): Uint8Array {
  const bytes = bigIntToLittleEndian(mod(y, P), 32);
  bytes[31] = (bytes[31]! & 0x7f) |
    (Number(signBit) << 7);
  return bytes;
}

function x25519PublicFromPrivate(
  privateKey: Uint8Array,
): Uint8Array {
  try {
    const scalar = clampX25519Private(privateKey);
    // RFC 7748 / XEdDSA Curve25519 basepoint is u=9.
    const output = new Uint8Array(32);
    const u = scalarMultMontgomery(scalar, 9n);
    output.set(bigIntToLittleEndian(u, 32));
    return output;
  } catch (error) {
    throw new CryptoError(
      "CRYPTO_OPERATION_FAILED",
      "Failed to derive X25519 public key for XEd25519.",
      { cause: error },
    );
  }
}

/**
 * Montgomery ladder for Curve25519, implemented only for public-key
 * derivation from an already-clamped scalar. This is intentionally not used
 * as the generic X25519 DH implementation; Node's audited primitive remains
 * the DH backend.
 */
function scalarMultMontgomery(k: bigint, u: bigint): bigint {
  const x1 = u;
  let x2 = 1n;
  let z2 = 0n;
  let x3 = x1;
  let z3 = 1n;
  let swap = 0n;
  const a24 = 121665n;

  for (let t = 254; t >= 0; t -= 1) {
    const kt = (k >> BigInt(t)) & 1n;
    swap ^= kt;
    if (swap) {
      [x2, x3] = [x3, x2];
      [z2, z3] = [z3, z2];
    }
    swap = kt;

    const A = mod(x2 + z2, P);
    const AA = mod(A * A, P);
    const B = mod(x2 - z2, P);
    const BB = mod(B * B, P);
    const E = mod(AA - BB, P);
    const C = mod(x3 + z3, P);
    const Dm = mod(x3 - z3, P);
    const DA = mod(Dm * A, P);
    const CB = mod(C * B, P);

    x3 = mod((DA + CB) ** 2n, P);
    z3 = mod(x1 * (DA - CB) ** 2n, P);
    x2 = mod(AA * BB, P);
    z2 = mod(E * mod(AA + a24 * E, P), P);
  }

  if (swap) {
    [x2, x3] = [x3, x2];
    [z2, z3] = [z3, z2];
  }

  return mod(x2 * modInv(z2, P), P);
}

function clampX25519Private(
  input: Uint8Array,
): bigint {
  const k = input.slice();
  k[0] = k[0]! & 248;
  k[31] = k[31]! & 127;
  k[31] = k[31]! | 64;
  return littleEndianToBigInt(k);
}

function hashToScalar(
  hash: (data: Uint8Array) => Uint8Array,
  input: Uint8Array,
): bigint {
  return littleEndianToBigInt(hash(input)) % Q;
}

function domainPrefix(index: number): Uint8Array {
  const output = new Uint8Array(32);
  output.fill(0xff);
  output[0] = 0xff - index;
  return output;
}

function mod(a: bigint, m: bigint): bigint {
  const value = a % m;
  return value < 0n ? value + m : value;
}

function modInv(a: bigint, m: bigint): bigint {
  let oldR = mod(a, m);
  let r = m;
  let oldS = 1n;
  let s = 0n;

  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }

  if (oldR !== 1n) {
    throw new Error("No modular inverse exists.");
  }

  return mod(oldS, m);
}

function littleEndianToBigInt(
  bytes: Uint8Array,
): bigint {
  let value = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    value = (value << 8n) | BigInt(bytes[i]!);
  }
  return value;
}

function bigIntToLittleEndian(
  value: bigint,
  length: number,
): Uint8Array {
  const output = new Uint8Array(length);
  let current = value;
  for (let i = 0; i < length; i += 1) {
    output[i] = Number(current & 0xffn);
    current >>= 8n;
  }
  return output;
}

function concat(...values: Uint8Array[]): Uint8Array {
  const total = values.reduce(
    (sum, value) => sum + value.byteLength,
    0,
  );
  const output = new Uint8Array(total);
  let offset = 0;
  for (const value of values) {
    output.set(value, offset);
    offset += value.byteLength;
  }
  return output;
}

function equalBytes(
  a: Uint8Array,
  b: Uint8Array,
): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}
