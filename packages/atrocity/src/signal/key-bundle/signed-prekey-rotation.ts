import type { SignalIdentityMaterial, SignalSignedPreKeyMaterial } from "./prekey-bundle-types.js";
import { PreKeyBundleError } from "./prekey-bundle-errors.js";
import type { SignedPreKeyRotationDecision, SignedPreKeyRotationPolicy, SignedPreKeyRotationReason } from "./signed-prekey-rotation-types.js";

export type SignedPreKeyGenerator = (
  identity: SignalIdentityMaterial,
  id: number,
  generatedAt: number,
) => Promise<SignalSignedPreKeyMaterial>;

export class SignedPreKeyRotation {
  constructor(
    private readonly policy: SignedPreKeyRotationPolicy,
    private readonly generator: SignedPreKeyGenerator,
  ) {
    if (!Number.isSafeInteger(policy.maxAgeMs) || policy.maxAgeMs <= 0) {
      throw new PreKeyBundleError(
        "PREKEY_BUNDLE_INVALID",
        "Signed pre-key max age must be a positive safe integer.",
      );
    }
  }

  shouldRotate(
    current: SignalSignedPreKeyMaterial,
    now: number,
  ): SignedPreKeyRotationDecision {
    validateTime(now);

    const age = now - current.generatedAt;
    if (age >= this.policy.maxAgeMs) {
      return Object.freeze({
        required: true,
        reason: "age" as SignedPreKeyRotationReason,
      });
    }

    return Object.freeze({ required: false });
  }

  async rotate(
    identity: SignalIdentityMaterial,
    current: SignalSignedPreKeyMaterial,
    reason: SignedPreKeyRotationReason = "manual",
    now = Date.now(),
  ): Promise<SignalSignedPreKeyMaterial> {
    validateTime(now);

    const nextId = current.id + 1;
    if (!Number.isSafeInteger(nextId) || nextId <= current.id || nextId > 0xffffff) {
      throw new PreKeyBundleError(
        "PREKEY_BUNDLE_INVALID",
        "Next signed pre-key id is outside the supported range.",
      );
    }

    const generated = await this.generator(identity, nextId, now);
    if (generated.id !== nextId) {
      throw new PreKeyBundleError(
        "PREKEY_BUNDLE_INVALID",
        `Signed pre-key generator returned id ${generated.id}, expected ${nextId}.`,
      );
    }

    void reason;
    return Object.freeze({
      ...generated,
      publicKey: generated.publicKey.slice(),
      privateKey: generated.privateKey.slice(),
      signature: generated.signature.slice(),
    });
  }
}

function validateTime(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PreKeyBundleError(
      "PREKEY_BUNDLE_INVALID",
      "Timestamp must be a non-negative safe integer.",
    );
  }
}
