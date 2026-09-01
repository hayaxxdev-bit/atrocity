export type DeviceIdentity = {
  readonly deviceId: Uint8Array;
  readonly registrationId: number;
  readonly identityKeyPublic: Uint8Array;
  readonly identityKeyPrivate: Uint8Array;
};

export type IdentitySigningKey = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type SignedPreKey = {
  readonly keyId: number;
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
  readonly signature: Uint8Array;
  readonly generatedAt: number;
};

export type OneTimePreKey = {
  readonly keyId: number;
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type AuthenticationCredentials = {
  readonly device: DeviceIdentity;
  readonly identitySigningKey: IdentitySigningKey;
  readonly signedPreKey: SignedPreKey;
  readonly registrationId: number;
  readonly advSecretKey?: Uint8Array;
  readonly noiseStatic?: {
    readonly publicKey: Uint8Array;
    readonly privateKey: Uint8Array;
  };
};

export type CredentialKeyPair = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type RegistrationBundle = {
  readonly eRegid: Uint8Array;
  readonly eKeytype: Uint8Array;
  readonly eIdent: Uint8Array;
  readonly eSkeyId: Uint8Array;
  readonly eSkeyVal: Uint8Array;
  readonly eSkeySig: Uint8Array;
  readonly buildHash: Uint8Array;
  readonly deviceProps: Uint8Array;
};
