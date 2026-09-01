import type { CryptoProvider } from "../crypto/index.js";

export type SignalIdentity = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export function generateSignalIdentity(
  crypto: CryptoProvider,
): SignalIdentity {
  const keyPair = crypto.generateX25519KeyPair();
  return Object.freeze({
    publicKey: keyPair.publicKey.slice(),
    privateKey: keyPair.privateKey.slice(),
  });
}

export function fromX25519KeyPair(
  keyPair: { readonly publicKey: Uint8Array; readonly privateKey: Uint8Array },
): SignalIdentity {
  if (
    keyPair.publicKey.byteLength !== 32 ||
    keyPair.privateKey.byteLength !== 32
  ) {
    throw new TypeError("Signal identity must contain 32-byte X25519 keys.");
  }

  return Object.freeze({
    publicKey: keyPair.publicKey.slice(),
    privateKey: keyPair.privateKey.slice(),
  });
}

export function identityPublicKey(
  identity: SignalIdentity,
): Uint8Array {
  return identity.publicKey.slice();
}
