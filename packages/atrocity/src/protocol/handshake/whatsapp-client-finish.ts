import type { ClientFinish, HandshakeMessage } from "./handshake-types.js";
import { NoiseError } from "../../noise/noise-errors.js";

export type ClientFinishInput = {
  readonly encryptedStatic: Uint8Array;
  readonly encryptedPayload: Uint8Array;
};

export function buildWhatsAppClientFinish(
  input: ClientFinishInput,
): HandshakeMessage {
  validateEncryptedField(
    input.encryptedStatic,
    "encrypted static",
  );
  validateEncryptedField(
    input.encryptedPayload,
    "encrypted payload",
  );

  const finish: ClientFinish = Object.freeze({
    static: input.encryptedStatic.slice(),
    payload: input.encryptedPayload.slice(),
  });

  return Object.freeze({
    type: "clientFinish",
    clientFinish: finish,
  });
}

function validateEncryptedField(
  value: Uint8Array,
  name: string,
): void {
  if (!(value instanceof Uint8Array)) {
    throw new NoiseError(
      "NOISE_INVALID_INPUT",
      `ClientFinish ${name} must be Uint8Array.`,
    );
  }

  if (value.byteLength < 16) {
    throw new NoiseError(
      "NOISE_INVALID_INPUT",
      `ClientFinish ${name} must contain at least an authentication tag.`,
    );
  }
}
