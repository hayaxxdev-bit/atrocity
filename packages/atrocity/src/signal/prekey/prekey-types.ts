import type { SignalIdentity } from "../identity.js";

export type SignalIdentityKey = SignalIdentity;

export type SignedPreKeyRecord = {
  readonly keyId: number;
  readonly keyPair: {
    readonly publicKey: Uint8Array;
    readonly privateKey: Uint8Array;
  };
  readonly signature: Uint8Array;
  readonly generatedAt: number;
};

export type OneTimePreKeyRecord = {
  readonly keyId: number;
  readonly keyPair: {
    readonly publicKey: Uint8Array;
    readonly privateKey: Uint8Array;
  };
};

export type PreKeyBundle = {
  readonly registrationId: number;
  readonly identityKey: Uint8Array;
  readonly signedPreKeyId: number;
  readonly signedPreKey: Uint8Array;
  readonly signedPreKeySignature: Uint8Array;
  readonly oneTimePreKeyId?: number;
  readonly oneTimePreKey?: Uint8Array;
};

export type PreKeyStore = {
  getIdentityKey(): SignalIdentity | undefined;
  getRegistrationId(): number | undefined;
  getSignedPreKey(): SignedPreKeyRecord | undefined;
  getOneTimePreKey(keyId: number): OneTimePreKeyRecord | undefined;
  listOneTimePreKeyIds(): readonly number[];

  setIdentityKey(key: SignalIdentity): void;
  setRegistrationId(registrationId: number): void;
  setSignedPreKey(key: SignedPreKeyRecord): void;
  setOneTimePreKey(key: OneTimePreKeyRecord): void;
  removeOneTimePreKey(keyId: number): void;
};
