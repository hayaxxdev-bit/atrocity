import { createHash } from "node:crypto";
import type { SignalKeyBundle } from "./prekey-bundle-types.js";
import { validateSignalKeyBundle } from "./prekey-bundle-validator.js";

export type KeyBundleDigestInput = {
  readonly registrationId: number;
  readonly identityKey: Uint8Array;
  readonly signedPreKeyId: number;
  readonly signedPreKeyPublic: Uint8Array;
  readonly signedPreKeySignature: Uint8Array;
  readonly preKeys: readonly {
    readonly id: number;
    readonly publicKey: Uint8Array;
  }[];
};

export function createKeyBundleDigest(
  bundle: SignalKeyBundle,
): Uint8Array {
  validateSignalKeyBundle(bundle);

  const input: KeyBundleDigestInput = {
    registrationId: bundle.registrationId,
    identityKey: bundle.identityKey.publicKey,
    signedPreKeyId: bundle.signedPreKey.id,
    signedPreKeyPublic: bundle.signedPreKey.publicKey,
    signedPreKeySignature: bundle.signedPreKey.signature,
    preKeys: bundle.preKeys
      .map((key) => ({
        id: key.id,
        publicKey: key.publicKey,
      }))
      .sort((a, b) => a.id - b.id),
  };

  const hash = createHash("sha256");
  hash.update(uint32(input.registrationId));

  hash.update(input.identityKey);
  hash.update(uint32(input.signedPreKeyId));
  hash.update(input.signedPreKeyPublic);
  hash.update(input.signedPreKeySignature);

  for (const preKey of input.preKeys) {
    hash.update(uint32(preKey.id));
    hash.update(preKey.publicKey);
  }

  return new Uint8Array(hash.digest());
}

export function digestEquals(
  left: Uint8Array,
  right: Uint8Array,
): boolean {
  if (left.byteLength !== right.byteLength) return false;

  let difference = 0;
  for (let i = 0; i < left.byteLength; i += 1) {
    difference |= left[i]! ^ right[i]!;
  }

  return difference === 0;
}

function uint32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = (value >>> 24) & 0xff;
  out[1] = (value >>> 16) & 0xff;
  out[2] = (value >>> 8) & 0xff;
  out[3] = value & 0xff;
  return out;
}
