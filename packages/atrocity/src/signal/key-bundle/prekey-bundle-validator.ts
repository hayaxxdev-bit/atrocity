import type {
  SignalKeyBundle,
  SignalPreKeyMaterial,
  SignalSignedPreKeyMaterial,
} from "./prekey-bundle-types.js";
import { PreKeyBundleError } from "./prekey-bundle-errors.js";

export function validateSignalKeyBundle(
  bundle: SignalKeyBundle,
): void {
  if (!Number.isSafeInteger(bundle.registrationId) || bundle.registrationId <= 0) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_INVALID",
      "Registration id must be a positive safe integer.",
    );
  }

  validateBytes(bundle.identityKey.publicKey, "identity public key", 32);
  validateBytes(bundle.identityKey.privateKey, "identity private key", 32);

  validateSignedPreKey(bundle.signedPreKey);

  if (bundle.preKeys.length === 0) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_EMPTY",
      "Signal key bundle must contain at least one pre-key.",
    );
  }

  const ids = new Set<number>();
  for (const preKey of bundle.preKeys) {
    validatePreKey(preKey);

    if (ids.has(preKey.id)) {
      throw new PreKeyBundleError(
        "PREKEY_BUNDLE_DUPLICATE_ID",
        `Duplicate pre-key id ${preKey.id}.`,
      );
    }

    ids.add(preKey.id);
  }
}

function validatePreKey(
  preKey: SignalPreKeyMaterial,
): void {
  validateId(preKey.id, "pre-key");
  validateBytes(preKey.publicKey, "pre-key public key", 32);
  validateBytes(preKey.privateKey, "pre-key private key", 32);
}

function validateSignedPreKey(
  preKey: SignalSignedPreKeyMaterial,
): void {
  validateId(preKey.id, "signed pre-key");
  validateBytes(preKey.publicKey, "signed pre-key public key", 32);
  validateBytes(preKey.privateKey, "signed pre-key private key", 32);
  validateBytes(preKey.signature, "signed pre-key signature", 64);

  if (!Number.isSafeInteger(preKey.generatedAt) || preKey.generatedAt < 0) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_INVALID",
      "Signed pre-key generatedAt must be a non-negative safe integer.",
    );
  }
}

function validateId(id: number, label: string): void {
  if (!Number.isSafeInteger(id) || id <= 0 || id > 0xffffff) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_INVALID",
      `${label} id is outside the supported range.`,
    );
  }
}

function validateBytes(
  value: Uint8Array,
  label: string,
  expectedLength: number,
): void {
  if (
    !(value instanceof Uint8Array) ||
    value.byteLength !== expectedLength
  ) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_INVALID_KEY",
      `${label} must be exactly ${expectedLength} bytes.`,
    );
  }
}
