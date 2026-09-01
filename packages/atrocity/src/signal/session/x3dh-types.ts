export type X3DHPreKeyBundle = {
  readonly registrationId: number;
  readonly identityKey: Uint8Array;          // X25519 DH identity
  readonly signedPreKeyId: number;
  readonly signedPreKey: Uint8Array;        // X25519
  readonly signedPreKeySignature: Uint8Array;
  readonly oneTimePreKeyId?: number;
  readonly oneTimePreKey?: Uint8Array;      // X25519
};

export type X3DHIdentity = {
  readonly publicKey: Uint8Array;           // X25519 identity
  readonly privateKey: Uint8Array;
};

export type X3DHInitialMessage = {
  readonly identityKey: Uint8Array;         // initiator X25519 identity
  readonly ephemeralKey: Uint8Array;        // initiator X25519 ephemeral
  readonly signedPreKeyId: number;
  readonly oneTimePreKeyId?: number;
  readonly associatedData: Uint8Array;
  readonly sharedSecret: Uint8Array;
};

export type X3DHResponderContext = {
  readonly identityKey: Uint8Array;         // responder X25519 identity
  readonly signedPreKeyId: number;
  readonly signedPreKeyPrivate: Uint8Array;
  readonly oneTimePreKeyId?: number;
  readonly oneTimePreKeyPrivate?: Uint8Array;
};

export type X3DHSignatureVerifier = (
  identityKey: Uint8Array,
  signedPreKey: Uint8Array,
  signature: Uint8Array,
) => boolean;
