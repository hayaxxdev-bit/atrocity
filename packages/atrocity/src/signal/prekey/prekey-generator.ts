import type { CryptoProvider } from "../../crypto/index.js";
import { XEd25519Signer } from "../../crypto/xed25519.js";
import { PreKeyError } from "./prekey-errors.js";
import type {
  OneTimePreKeyRecord,
  PreKeyBundle,
  PreKeyStore,
  SignalIdentityKey,
  SignedPreKeyRecord,
} from "./prekey-types.js";

export type PreKeyGeneratorOptions = {
  readonly oneTimePreKeyCount?: number;
  readonly signedPreKeyId?: number;
  readonly oneTimePreKeyStart?: number;
};

export class PreKeyGenerator {
  constructor(
    private readonly crypto: CryptoProvider,
    private readonly xEd25519: XEd25519Signer,
  ) {}

  generateIdentity(): SignalIdentityKey {
    const key = this.crypto.generateX25519KeyPair();
    return Object.freeze({
      publicKey: key.publicKey.slice(),
      privateKey: key.privateKey.slice(),
    });
  }

  generateSignedPreKey(
    identity: SignalIdentityKey,
    keyId: number,
  ): SignedPreKeyRecord {
    validateId(keyId, "signedPreKeyId");

    const keyPair = this.crypto.generateX25519KeyPair();
    const signature = this.xEd25519.sign(
      identity.privateKey,
      keyPair.publicKey,
    );

    return Object.freeze({
      keyId,
      keyPair: Object.freeze({
        publicKey: keyPair.publicKey.slice(),
        privateKey: keyPair.privateKey.slice(),
      }),
      signature: signature.slice(),
      generatedAt: Date.now(),
    });
  }

  generateOneTimePreKeys(
    count: number,
    startId: number,
  ): readonly OneTimePreKeyRecord[] {
    if (!Number.isSafeInteger(count) || count < 0 || count > 4096) {
      throw new PreKeyError(
        "PREKEY_INVALID",
        "One-time pre-key count must be between 0 and 4096.",
      );
    }

    validateId(startId, "oneTimePreKeyStart");

    const keys: OneTimePreKeyRecord[] = [];
    for (let i = 0; i < count; i += 1) {
      const keyPair = this.crypto.generateX25519KeyPair();
      keys.push(Object.freeze({
        keyId: startId + i,
        keyPair: Object.freeze({
          publicKey: keyPair.publicKey.slice(),
          privateKey: keyPair.privateKey.slice(),
        }),
      }));
    }

    return Object.freeze(keys);
  }

  initializeStore(
    store: PreKeyStore,
    registrationId: number,
    options: PreKeyGeneratorOptions = {},
  ): void {
    validateId(registrationId, "registrationId");

    const identity = this.generateIdentity();
    const signedPreKey = this.generateSignedPreKey(
      identity,
      options.signedPreKeyId ?? this.randomId(),
    );

    store.setIdentityKey(identity);
    store.setRegistrationId(registrationId);
    store.setSignedPreKey(signedPreKey);

    for (const key of this.generateOneTimePreKeys(
      options.oneTimePreKeyCount ?? 100,
      options.oneTimePreKeyStart ?? 1,
    )) {
      store.setOneTimePreKey(key);
    }
  }

  buildBundle(store: PreKeyStore): PreKeyBundle {
    const identity = store.getIdentityKey();
    const registrationId = store.getRegistrationId();
    const signed = store.getSignedPreKey();

    if (!identity || registrationId === undefined || !signed) {
      throw new PreKeyError(
        "PREKEY_NOT_FOUND",
        "Identity, registration ID, and signed pre-key are required.",
      );
    }

    const ids = store.listOneTimePreKeyIds();
    const oneTime = ids.length > 0
      ? store.getOneTimePreKey(ids[0]!)
      : undefined;

    return Object.freeze({
      registrationId,
      identityKey: identity.publicKey.slice(),
      signedPreKeyId: signed.keyId,
      signedPreKey: signed.keyPair.publicKey.slice(),
      signedPreKeySignature: signed.signature.slice(),
      ...(oneTime
        ? {
            oneTimePreKeyId: oneTime.keyId,
            oneTimePreKey: oneTime.keyPair.publicKey.slice(),
          }
        : {}),
    });
  }

  consumeOneTimePreKey(
    store: PreKeyStore,
    keyId: number,
  ): OneTimePreKeyRecord {
    const key = store.getOneTimePreKey(keyId);
    if (!key) {
      throw new PreKeyError(
        "PREKEY_NOT_FOUND",
        `One-time pre-key ${keyId} does not exist.`,
      );
    }

    store.removeOneTimePreKey(keyId);
    return key;
  }

  private randomId(): number {
    const bytes = this.crypto.randomBytes(4);
    return (
      ((bytes[0]! << 24) |
        (bytes[1]! << 16) |
        (bytes[2]! << 8) |
        bytes[3]!) >>> 0
    ) & 0x7fffffff;
  }
}

function validateId(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0x7fffffff) {
    throw new PreKeyError(
      "PREKEY_INVALID",
      `${label} must be a uint31 value.`,
    );
  }
}
