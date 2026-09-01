import type {
  WhatsAppNoiseFrame,
  WhatsAppNoiseFrameLimits,
} from "./wa-noise-frame-types.js";
import { DEFAULT_WA_NOISE_FRAME_LIMITS } from "./wa-noise-frame-types.js";
import { WhatsAppNoiseFrameError } from "./wa-noise-frame-errors.js";

const LENGTH_BYTES = 4;

export class WhatsAppNoiseFrameCodec {
  constructor(
    private readonly limits: WhatsAppNoiseFrameLimits =
      DEFAULT_WA_NOISE_FRAME_LIMITS,
  ) {}

  encode(
    header: Uint8Array,
    ciphertext: Uint8Array,
  ): Uint8Array {
    validateHeader(header);
    if (!(ciphertext instanceof Uint8Array)) {
      throw new WhatsAppNoiseFrameError(
        "WA_NOISE_FRAME_INVALID",
        "Ciphertext must be Uint8Array.",
      );
    }

    if (ciphertext.byteLength > this.limits.maxCiphertextBytes) {
      throw new WhatsAppNoiseFrameError(
        "WA_NOISE_FRAME_TOO_LARGE",
        "Ciphertext exceeds the configured frame limit.",
      );
    }

    const output = new Uint8Array(
      header.byteLength + LENGTH_BYTES + ciphertext.byteLength,
    );

    output.set(header, 0);
    writeUint32BE(output, header.byteLength, ciphertext.byteLength);
    output.set(ciphertext, header.byteLength + LENGTH_BYTES);

    if (output.byteLength > this.limits.maxFrameBytes) {
      throw new WhatsAppNoiseFrameError(
        "WA_NOISE_FRAME_TOO_LARGE",
        "Encoded frame exceeds the configured frame limit.",
      );
    }

    return output;
  }

  decode(
    header: Uint8Array,
    frame: Uint8Array,
  ): WhatsAppNoiseFrame {
    validateHeader(header);

    if (!(frame instanceof Uint8Array)) {
      throw new WhatsAppNoiseFrameError(
        "WA_NOISE_FRAME_INVALID",
        "Frame must be Uint8Array.",
      );
    }

    if (frame.byteLength > this.limits.maxFrameBytes) {
      throw new WhatsAppNoiseFrameError(
        "WA_NOISE_FRAME_TOO_LARGE",
        "Frame exceeds the configured frame limit.",
      );
    }

    if (frame.byteLength < header.byteLength + LENGTH_BYTES) {
      throw new WhatsAppNoiseFrameError(
        "WA_NOISE_FRAME_MALFORMED",
        "Frame is shorter than the configured header and length field.",
      );
    }

    for (let i = 0; i < header.byteLength; i += 1) {
      if (frame[i] !== header[i]) {
        throw new WhatsAppNoiseFrameError(
          "WA_NOISE_FRAME_HEADER_MISMATCH",
          `Unexpected WhatsApp Noise header byte at offset ${i}.`,
        );
      }
    }

    const payloadLength = readUint32BE(frame, header.byteLength);
    if (payloadLength > this.limits.maxCiphertextBytes) {
      throw new WhatsAppNoiseFrameError(
        "WA_NOISE_FRAME_TOO_LARGE",
        "Declared ciphertext exceeds the configured limit.",
      );
    }

    const payloadStart = header.byteLength + LENGTH_BYTES;
    const payloadEnd = payloadStart + payloadLength;

    if (payloadEnd !== frame.byteLength) {
      throw new WhatsAppNoiseFrameError(
        "WA_NOISE_FRAME_MALFORMED",
        "Frame payload length does not match actual frame size.",
      );
    }

    return Object.freeze({
      header: header.slice(),
      ciphertext: frame.slice(payloadStart, payloadEnd),
    });
  }
}

function validateHeader(header: Uint8Array): void {
  if (!(header instanceof Uint8Array) || header.byteLength === 0) {
    throw new WhatsAppNoiseFrameError(
      "WA_NOISE_FRAME_INVALID",
      "WhatsApp Noise header must be non-empty.",
    );
  }
}

function writeUint32BE(
  output: Uint8Array,
  offset: number,
  value: number,
): void {
  output[offset] = (value >>> 24) & 0xff;
  output[offset + 1] = (value >>> 16) & 0xff;
  output[offset + 2] = (value >>> 8) & 0xff;
  output[offset + 3] = value & 0xff;
}

function readUint32BE(
  input: Uint8Array,
  offset: number,
): number {
  return (
    ((input[offset]! << 24) >>> 0) |
    (input[offset + 1]! << 16) |
    (input[offset + 2]! << 8) |
    input[offset + 3]!
  ) >>> 0;
}
