import type { ClientPayload } from "../payload/client-payload-types.js";
import type { CredentialKeyPair, RegistrationBundle } from "./credential-types.js";
import { CredentialError } from "./credential-errors.js";
import { NodeCryptoProvider } from "../../crypto/node-crypto-provider.js";

export type RegistrationBundleInput = {
  readonly registrationId: number;
  readonly signedPreKey: CredentialKeyPair;
  readonly signedPreKeyId: number;
  readonly signedPreKeySignature: Uint8Array;
  readonly identityPublicKey: Uint8Array;
  readonly buildHash: Uint8Array;
  readonly deviceProps: Uint8Array;
};

/**
 * Encapsulates the shape expected by ClientPayload.devicePairingData.
 *
 * Exact WhatsApp registration semantics are still target-profile work.
 */
export function createRegistrationBundle(
  input: RegistrationBundleInput,
): RegistrationBundle {
  validate32(input.signedPreKey.publicKey, "signedPreKey.publicKey");
  validate32(input.identityPublicKey, "identityPublicKey");

  const crypto = new NodeCryptoProvider();

  if (!Number.isSafeInteger(input.registrationId) || input.registrationId < 0) {
    throw new CredentialError(
      "CREDENTIAL_INVALID",
      "registrationId must be a non-negative safe integer.",
    );
  }

  if (!Number.isSafeInteger(input.signedPreKeyId) || input.signedPreKeyId < 0) {
    throw new CredentialError(
      "CREDENTIAL_INVALID",
      "signedPreKeyId must be a non-negative safe integer.",
    );
  }

  if (!(input.signedPreKeySignature instanceof Uint8Array) || input.signedPreKeySignature.length === 0) {
    throw new CredentialError(
      "CREDENTIAL_INVALID",
      "signedPreKeySignature must be non-empty bytes.",
    );
  }

  const regid = uint32Bytes(input.registrationId);
  const keyType = new Uint8Array([5]);
  const signedId = uint32Bytes(input.signedPreKeyId);

  return Object.freeze({
    eRegid: regid,
    eKeytype: keyType,
    eIdent: input.identityPublicKey.slice(),
    eSkeyId: signedId,
    eSkeyVal: input.signedPreKey.publicKey.slice(),
    eSkeySig: input.signedPreKeySignature.slice(),
    buildHash: input.buildHash.slice(),
    deviceProps: input.deviceProps.slice(),
  });
}

export function registrationBundleToPayload(
  bundle: RegistrationBundle,
): Pick<ClientPayload, "devicePairingData"> {
  return Object.freeze({
    devicePairingData: Object.freeze({
      buildHash: bundle.buildHash.slice(),
      deviceProps: bundle.deviceProps.slice(),
      eRegid: bundle.eRegid.slice(),
      eKeytype: bundle.eKeytype.slice(),
      eIdent: bundle.eIdent.slice(),
      eSkeyId: bundle.eSkeyId.slice(),
      eSkeyVal: bundle.eSkeyVal.slice(),
      eSkeySig: bundle.eSkeySig.slice(),
    }),
  });
}

void crypto;

function validate32(value: Uint8Array, name: string): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new CredentialError(
      "CREDENTIAL_KEY_MATERIAL_INVALID",
      `${name} must be exactly 32 bytes.`,
    );
  }
}

function uint32Bytes(value: number): Uint8Array {
  return new Uint8Array([
    value >>> 24,
    value >>> 16,
    value >>> 8,
    value,
  ]);
}
