export type SignalPreKeyMaterial = {
  readonly id: number;
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type SignalSignedPreKeyMaterial = {
  readonly id: number;
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
  readonly signature: Uint8Array;
  readonly generatedAt: number;
};

export type SignalIdentityMaterial = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type SignalKeyBundle = {
  readonly identityKey: SignalIdentityMaterial;
  readonly registrationId: number;
  readonly signedPreKey: SignalSignedPreKeyMaterial;
  readonly preKeys: readonly SignalPreKeyMaterial[];
};
