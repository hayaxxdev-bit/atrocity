import { ByteFormatError } from "../../foundation/bytes/index.js";

export type NoiseFrame = {
  readonly payload: Uint8Array;
};

/**
 * Generic header/payload framing helper.
 * It intentionally does not encode target-specific record semantics.
 */
export function encodeNoiseFrame(
  header: Uint8Array,
  payload: Uint8Array,
): Uint8Array {
  if (header.byteLength === 0) {
    throw new ByteFormatError("Noise frame header must not be empty.");
  }

  const output = new Uint8Array(header.byteLength + payload.byteLength);
  output.set(header, 0);
  output.set(payload, header.byteLength);
  return output;
}

export function decodeNoiseFrame(
  header: Uint8Array,
  frame: Uint8Array,
): NoiseFrame {
  if (header.byteLength === 0) {
    throw new ByteFormatError("Noise frame header must not be empty.");
  }

  if (frame.byteLength < header.byteLength) {
    throw new ByteFormatError("Noise frame is shorter than its header.");
  }

  for (let i = 0; i < header.byteLength; i += 1) {
    if (frame[i] !== header[i]) {
      throw new ByteFormatError(
        `Noise frame header mismatch at offset ${i}.`,
      );
    }
  }

  return Object.freeze({
    payload: frame.slice(header.byteLength),
  });
}
