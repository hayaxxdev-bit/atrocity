import type { SignalKeyBundle } from "./prekey-bundle-types.js";

export type PreKeyBundleState = {
  readonly bundle: SignalKeyBundle;
  readonly uploadedPreKeyCount: number;
  readonly lastUploadedAt?: number;
  readonly digest?: Uint8Array;
};

export class PreKeyBundleStateStore {
  private value?: PreKeyBundleState;

  get(): PreKeyBundleState | undefined {
    return this.value;
  }

  set(state: PreKeyBundleState): void {
    this.value = Object.freeze({
      ...state,
      bundle: cloneBundle(state.bundle),
      ...(state.digest
        ? { digest: state.digest.slice() }
        : {}),
    });
  }

  clear(): void {
    this.value = undefined;
  }
}

function cloneBundle(
  bundle: SignalKeyBundle,
): SignalKeyBundle {
  return Object.freeze({
    identityKey: Object.freeze({
      publicKey: bundle.identityKey.publicKey.slice(),
      privateKey: bundle.identityKey.privateKey.slice(),
    }),
    registrationId: bundle.registrationId,
    signedPreKey: Object.freeze({
      ...bundle.signedPreKey,
      publicKey: bundle.signedPreKey.publicKey.slice(),
      privateKey: bundle.signedPreKey.privateKey.slice(),
      signature: bundle.signedPreKey.signature.slice(),
    }),
    preKeys: Object.freeze(
      bundle.preKeys.map((key) =>
        Object.freeze({
          ...key,
          publicKey: key.publicKey.slice(),
          privateKey: key.privateKey.slice(),
        })),
    ),
  });
}
