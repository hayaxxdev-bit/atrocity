import type {
  CryptoProvider,
  SigningKeyPair,
} from "../../crypto/index.js";
import { CredentialError } from "./credential-errors.js";
import type {
  AuthenticationCredentials,
  CredentialKeyPair,
  DeviceIdentity,
  IdentitySigningKey,
  SignedPreKey,
} from "./credential-types.js";

export type CredentialGeneratorOptions = {
  readonly identityDh?: CredentialKeyPair;
  readonly identitySigning?: SigningKeyPair;
  readonly signedPreKey?: CredentialKeyPair;
  readonly registrationId?: number;
  readonly signedPreKeyId?: number;
};

export class CredentialGenerator {
  constructor(private readonly crypto: CryptoProvider) {}

  generateX25519KeyPair(): CredentialKeyPair {
    return this.crypto.generateX25519KeyPair();
  }

  generateEd25519KeyPair(): SigningKeyPair {
    return this.crypto.generateEd25519KeyPair();
  }

  generateRegistrationId(): number {
    const random = this.crypto.randomBytes(4);
    return (
      ((random[0]! << 24) |
        (random[1]! << 16) |
        (random[2]! << 8) |
        random[3]!) >>> 0
    ) & 0x7fffffff;
  }

  generateSignedPreKeyId(): number {
    const random = this.crypto.randomBytes(4);
    return (
      ((random[0]! << 24) |
        (random[1]! << 16) |
        (random[2]! << 8) |
        random[3]!) >>> 0
    ) & 0x7fffffff;
  }

  generate(options: CredentialGeneratorOptions = {}): AuthenticationCredentials {
    try {
      const identityDh = options.identityDh ?? this.generateX25519KeyPair();
      const identitySigning =
        options.identitySigning ?? this.generateEd25519KeyPair();
      const signedPreKey = options.signedPreKey ?? this.generateX25519KeyPair();

      const registrationId =
        options.registrationId ?? this.generateRegistrationId();
      const signedPreKeyId =
        options.signedPreKeyId ?? this.generateSignedPreKeyId();

      validateX25519(identityDh, "identityDh");
      validateX25519(signedPreKey, "signedPreKey");
      validateEd25519(identitySigning);

      const signature = this.crypto.sign(
        "Ed25519",
        identitySigning.privateKey,
        signedPreKey.publicKey,
      );

      const device: DeviceIdentity = Object.freeze({
        deviceId: this.crypto.randomBytes(16),
        registrationId,
        identityKeyPublic: identityDh.publicKey.slice(),
        identityKeyPrivate: identityDh.privateKey.slice(),
      });

      const identitySigningKey: IdentitySigningKey = Object.freeze({
        publicKey: identitySigning.publicKey.slice(),
        privateKey: identitySigning.privateKey.slice(),
      });

      const signedPreKeyModel: SignedPreKey = Object.freeze({
        keyId: signedPreKeyId,
        publicKey: signedPreKey.publicKey.slice(),
        privateKey: signedPreKey.privateKey.slice(),
        signature: signature.slice(),
        generatedAt: Date.now(),
      });

      return Object.freeze({
        device,
        identitySigningKey,
        signedPreKey: signedPreKeyModel,
        registrationId,
      });
    } catch (error) {
      if (error instanceof CredentialError) throw error;
      throw new CredentialError(
        "CREDENTIAL_GENERATION_FAILED",
        "Failed to generate authentication credentials.",
        { cause: error },
      );
    }
  }
}

function validateX25519(
  pair: CredentialKeyPair,
  name: string,
): void {
  if (pair.publicKey.byteLength !== 32 || pair.privateKey.byteLength !== 32) {
    throw new CredentialError(
      "CREDENTIAL_KEY_MATERIAL_INVALID",
      `${name} must contain 32-byte X25519 keys.`,
    );
  }
}

function validateEd25519(pair: SigningKeyPair): void {
  if (
    pair.publicKey.byteLength !== 32 ||
    pair.privateKey.byteLength !== 32
  ) {
    throw new CredentialError(
      "CREDENTIAL_KEY_MATERIAL_INVALID",
      "Ed25519 identity signing key must contain 32-byte keys.",
    );
  }
}
