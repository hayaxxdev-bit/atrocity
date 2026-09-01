import type { CryptoProvider } from "../../crypto/index.js";
import { X3DHError } from "./x3dh-errors.js";
import type {
  X3DHInitialMessage,
  X3DHPreKeyBundle,
  X3DHResponderContext,
  X3DHSignatureVerifier,
} from "./x3dh-types.js";

const X25519_TYPE_PREFIX = new Uint8Array([0x05]);

export type X3DHConfig = {
  readonly info: Uint8Array;
  readonly requireOneTimePreKey?: boolean;
  readonly verifySignedPreKey?: X3DHSignatureVerifier;
};

export class X3DH {
  constructor(
    private readonly crypto: CryptoProvider,
    private readonly config: X3DHConfig,
  ) {}

  createInitialMessage(
    bundle: X3DHPreKeyBundle,
    initiatorIdentity: { readonly publicKey: Uint8Array; readonly privateKey: Uint8Array },
  ): X3DHInitialMessage {
    validateBundle(bundle);
    validate32(initiatorIdentity.publicKey, "initiatorIdentity.publicKey");
    validate32(initiatorIdentity.privateKey, "initiatorIdentity.privateKey");

    const valid = this.config.verifySignedPreKey
      ? this.config.verifySignedPreKey(
          bundle.identityKey,
          bundle.signedPreKey,
          bundle.signedPreKeySignature,
        )
      : false;

    if (!valid) {
      throw new X3DHError(
        "X3DH_SIGNATURE_INVALID",
        "Signed pre-key signature verification failed.",
      );
    }

    if (this.config.requireOneTimePreKey && !bundle.oneTimePreKey) {
      throw new X3DHError(
        "X3DH_INVALID_BUNDLE",
        "A one-time pre-key is required by this X3DH configuration.",
      );
    }

    const ephemeral = this.crypto.generateX25519KeyPair();

    const dh1 = this.crypto.x25519(
      initiatorIdentity.privateKey,
      bundle.signedPreKey,
    );
    const dh2 = this.crypto.x25519(
      ephemeral.privateKey,
      bundle.identityKey,
    );
    const dh3 = this.crypto.x25519(
      ephemeral.privateKey,
      bundle.signedPreKey,
    );

    const parts = [dh1, dh2, dh3];

    if (bundle.oneTimePreKey) {
      parts.push(
        this.crypto.x25519(ephemeral.privateKey, bundle.oneTimePreKey),
      );
    }

    const sharedSecret = this.deriveSharedSecret(concat(...parts));
    const associatedData = concat(
      encodeX25519PublicKey(initiatorIdentity.publicKey),
      encodeX25519PublicKey(bundle.identityKey),
    );

    return Object.freeze({
      identityKey: initiatorIdentity.publicKey.slice(),
      ephemeralKey: ephemeral.publicKey.slice(),
      signedPreKeyId: bundle.signedPreKeyId,
      ...(bundle.oneTimePreKeyId === undefined
        ? {}
        : { oneTimePreKeyId: bundle.oneTimePreKeyId }),
      associatedData,
      sharedSecret,
    });
  }

  deriveResponderSecret(
    message: X3DHInitialMessage,
    context: X3DHResponderContext,
  ): Uint8Array {
    validate32(message.identityKey, "message.identityKey");
    validate32(message.ephemeralKey, "message.ephemeralKey");
    validate32(context.identityKey, "context.identityKey");
    validate32(context.signedPreKeyPrivate, "context.signedPreKeyPrivate");

    if (context.signedPreKeyId !== message.signedPreKeyId) {
      throw new X3DHError(
        "X3DH_INVALID_BUNDLE",
        "Signed pre-key id does not match the responder context.",
      );
    }

    const dh1 = this.crypto.x25519(
      context.signedPreKeyPrivate,
      message.identityKey,
    );
    const dh2 = this.crypto.x25519(
      context.identityKey,
      message.ephemeralKey,
    );
    const dh3 = this.crypto.x25519(
      context.signedPreKeyPrivate,
      message.ephemeralKey,
    );

    const parts = [dh1, dh2, dh3];

    if (message.oneTimePreKeyId !== undefined) {
      if (!context.oneTimePreKeyPrivate || context.oneTimePreKeyId !== message.oneTimePreKeyId) {
        throw new X3DHError(
          "X3DH_INVALID_BUNDLE",
          "One-time pre-key context is missing or mismatched.",
        );
      }

      parts.push(
        this.crypto.x25519(
          context.oneTimePreKeyPrivate,
          message.ephemeralKey,
        ),
      );
    }

    const sharedSecret = this.deriveSharedSecret(concat(...parts));

    const expectedAd = concat(
      encodeX25519PublicKey(message.identityKey),
      encodeX25519PublicKey(context.identityKey),
    );

    if (!equalBytes(expectedAd, message.associatedData)) {
      throw new X3DHError(
        "X3DH_ASSOCIATED_DATA_INVALID",
        "X3DH associated data does not match the participating identities.",
      );
    }

    return sharedSecret;
  }

  private deriveSharedSecret(keyMaterial: Uint8Array): Uint8Array {
    try {
      // X3DH recommendation: prepend 32 bytes of 0xff for X25519 before
      // feeding the material to the application KDF.
      const domain = new Uint8Array(32).fill(0xff);
      return this.crypto.hkdf(
        "SHA-256",
        concat(domain, keyMaterial),
        new Uint8Array(0),
        this.config.info,
        32,
      );
    } catch (error) {
      throw new X3DHError(
        "X3DH_DERIVATION_FAILED",
        "Failed to derive the X3DH shared secret.",
        { cause: error },
      );
    }
  }
}

function validateBundle(bundle: X3DHPreKeyBundle): void {
  validate32(bundle.identityKey, "bundle.identityKey");
  validate32(bundle.signedPreKey, "bundle.signedPreKey");

  if (
    !Number.isSafeInteger(bundle.signedPreKeyId) ||
    bundle.signedPreKeyId < 0
  ) {
    throw new X3DHError("X3DH_INVALID_BUNDLE", "Invalid signed pre-key id.");
  }

  if (bundle.oneTimePreKey !== undefined) {
    validate32(bundle.oneTimePreKey, "bundle.oneTimePreKey");
    if (
      bundle.oneTimePreKeyId === undefined ||
      !Number.isSafeInteger(bundle.oneTimePreKeyId) ||
      bundle.oneTimePreKeyId < 0
    ) {
      throw new X3DHError(
        "X3DH_INVALID_BUNDLE",
        "One-time pre-key id is required when one-time pre-key is present.",
      );
    }
  }
}

function validate32(value: Uint8Array, name: string): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new X3DHError(
      "X3DH_INVALID_KEY",
      `${name} must be exactly 32 bytes.`,
    );
  }
}

function encodeX25519PublicKey(value: Uint8Array): Uint8Array {
  return concat(X25519_TYPE_PREFIX, value);
}

function concat(...values: Uint8Array[]): Uint8Array {
  const total = values.reduce((sum, value) => sum + value.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const value of values) {
    output.set(value, offset);
    offset += value.byteLength;
  }
  return output;
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let result = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}
