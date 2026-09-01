import type { CryptoProvider } from "../../crypto/index.js";
import type { X3DHSignatureVerifier } from "./x3dh-types.js";
import { PreKeyError } from "../prekey/prekey-errors.js";
import type {
  OneTimePreKeyRecord,
  PreKeyBundle,
  PreKeyStore,
} from "../prekey/prekey-types.js";
import { X3DH } from "./x3dh.js";
import type { X3DHInitialMessage } from "./x3dh-types.js";

export type InitiatorSessionBootstrap = {
  readonly initialMessage: X3DHInitialMessage;
  readonly sharedSecret: Uint8Array;
};

export type ResponderSessionBootstrap = {
  readonly sharedSecret: Uint8Array;
  readonly consumedOneTimePreKey?: OneTimePreKeyRecord;
};

export class SignalSessionInitializer {
  constructor(private readonly crypto: CryptoProvider) {}

  createInitiator(
    bundle: PreKeyBundle,
    initiatorIdentity: { readonly publicKey: Uint8Array; readonly privateKey: Uint8Array },
    info: Uint8Array,
    verifySignedPreKey: X3DHSignatureVerifier,
  ): InitiatorSessionBootstrap {
    const x3dh = new X3DH(this.crypto, {
      info,
      verifySignedPreKey,
    });
    const initialMessage = x3dh.createInitialMessage(bundle, initiatorIdentity);

    return Object.freeze({
      initialMessage,
      sharedSecret: initialMessage.sharedSecret.slice(),
    });
  }

  createResponder(
    store: PreKeyStore,
    initialMessage: X3DHInitialMessage,
    localIdentity: Uint8Array,
    signedPreKeyId: number,
    signedPreKeyPrivate: Uint8Array,
    info: Uint8Array,
  ): ResponderSessionBootstrap {
    const oneTimeKeyId = initialMessage.oneTimePreKeyId;
    let consumed: OneTimePreKeyRecord | undefined;

    if (oneTimeKeyId !== undefined) {
      consumed = store.getOneTimePreKey(oneTimeKeyId);
      if (!consumed) {
        throw new PreKeyError(
          "PREKEY_NOT_FOUND",
          `One-time pre-key ${oneTimeKeyId} was not found for session initialization.`,
        );
      }
    }

    const x3dh = new X3DH(this.crypto, { info });
    const sharedSecret = x3dh.deriveResponderSecret(
      initialMessage,
      {
        identityKey: localIdentity,
        signedPreKeyId,
        signedPreKeyPrivate,
        ...(consumed
          ? {
              oneTimePreKeyId: consumed.keyId,
              oneTimePreKeyPrivate: consumed.keyPair.privateKey,
            }
          : {}),
      },
    );

    // Consume only after all cryptographic checks have succeeded.
    if (consumed) {
      store.removeOneTimePreKey(consumed.keyId);
    }

    return Object.freeze({
      sharedSecret,
      ...(consumed ? { consumedOneTimePreKey: consumed } : {}),
    });
  }
}
