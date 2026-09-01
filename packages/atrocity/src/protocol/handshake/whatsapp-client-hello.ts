import { NoiseError } from "../../noise/noise-errors.js";
import type { HandshakeMessage } from "./handshake-types.js";

export const X25519_PUBLIC_KEY_BYTES = 32;

export type ClientHelloInput = {
  readonly ephemeralPublicKey: Uint8Array;
};

export function buildWhatsAppClientHello(
  input: ClientHelloInput,
): HandshakeMessage {
  validateEphemeral(input.ephemeralPublicKey);

  return Object.freeze({
    type: "clientHello",
    clientHello: Object.freeze({
      ephemeral: input.ephemeralPublicKey.slice(),
    }),
  });
}

export function validateEphemeral(
  ephemeralPublicKey: Uint8Array,
): void {
  if (!(ephemeralPublicKey instanceof Uint8Array)) {
    throw new NoiseError(
      "NOISE_INVALID_KEY",
      "ClientHello ephemeral key must be Uint8Array.",
    );
  }

  if (
    ephemeralPublicKey.byteLength !==
    X25519_PUBLIC_KEY_BYTES
  ) {
    throw new NoiseError(
      "NOISE_INVALID_KEY",
      `ClientHello ephemeral key must be ${X25519_PUBLIC_KEY_BYTES} bytes.`,
    );
  }
}
