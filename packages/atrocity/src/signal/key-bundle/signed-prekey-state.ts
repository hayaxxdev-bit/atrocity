
import type { SignalSignedPreKeyMaterial } from "./prekey-bundle-types.js";

export class ActiveSignedPreKeyState {
  private value?: SignalSignedPreKeyMaterial;

  constructor(initial?: SignalSignedPreKeyMaterial) {
    this.value = initial ? clone(initial) : undefined;
  }

  get(): SignalSignedPreKeyMaterial | undefined {
    return this.value ? clone(this.value) : undefined;
  }

  async commit(next: SignalSignedPreKeyMaterial): Promise<void> {
    this.value = clone(next);
  }

  clear(): void { this.value = undefined; }
}

function clone(value: SignalSignedPreKeyMaterial): SignalSignedPreKeyMaterial {
  return Object.freeze({
    ...value,
    publicKey: value.publicKey.slice(),
    privateKey: value.privateKey.slice(),
    signature: value.signature.slice(),
  });
}
