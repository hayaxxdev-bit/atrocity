import type {
  OneTimePreKeyRecord,
  PreKeyStore,
  SignalIdentityKey,
  SignedPreKeyRecord,
} from "./prekey-types.js";

export class MemoryPreKeyStore implements PreKeyStore {
  private identityKeyValue?: SignalIdentityKey;
  private registrationIdValue?: number;
  private signedPreKeyValue?: SignedPreKeyRecord;
  private readonly oneTimePreKeys = new Map<number, OneTimePreKeyRecord>();

  getIdentityKey(): SignalIdentityKey | undefined {
    return cloneIdentity(this.identityKeyValue);
  }

  getRegistrationId(): number | undefined {
    return this.registrationIdValue;
  }

  getSignedPreKey(): SignedPreKeyRecord | undefined {
    return cloneSigned(this.signedPreKeyValue);
  }

  getOneTimePreKey(keyId: number): OneTimePreKeyRecord | undefined {
    const value = this.oneTimePreKeys.get(keyId);
    return value ? cloneOneTime(value) : undefined;
  }

  listOneTimePreKeyIds(): readonly number[] {
    return Object.freeze([...this.oneTimePreKeys.keys()].sort((a, b) => a - b));
  }

  setIdentityKey(key: SignalIdentityKey): void {
    this.identityKeyValue = cloneIdentity(key);
  }

  setRegistrationId(registrationId: number): void {
    this.registrationIdValue = registrationId;
  }

  setSignedPreKey(key: SignedPreKeyRecord): void {
    this.signedPreKeyValue = cloneSigned(key);
  }

  setOneTimePreKey(key: OneTimePreKeyRecord): void {
    this.oneTimePreKeys.set(key.keyId, cloneOneTime(key));
  }

  removeOneTimePreKey(keyId: number): void {
    this.oneTimePreKeys.delete(keyId);
  }
}

function cloneIdentity(
  value: SignalIdentityKey | undefined,
): SignalIdentityKey | undefined {
  if (!value) return undefined;
  return Object.freeze({
    publicKey: value.publicKey.slice(),
    privateKey: value.privateKey.slice(),
  });
}

function cloneSigned(
  value: SignedPreKeyRecord | undefined,
): SignedPreKeyRecord | undefined {
  if (!value) return undefined;
  return Object.freeze({
    keyId: value.keyId,
    keyPair: Object.freeze({
      publicKey: value.keyPair.publicKey.slice(),
      privateKey: value.keyPair.privateKey.slice(),
    }),
    signature: value.signature.slice(),
    generatedAt: value.generatedAt,
  });
}

function cloneOneTime(
  value: OneTimePreKeyRecord,
): OneTimePreKeyRecord {
  return Object.freeze({
    keyId: value.keyId,
    keyPair: Object.freeze({
      publicKey: value.keyPair.publicKey.slice(),
      privateKey: value.keyPair.privateKey.slice(),
    }),
  });
}
