export type WhatsAppNoiseFrame = {
  readonly header: Uint8Array;
  readonly ciphertext: Uint8Array;
};

export type WhatsAppNoiseFrameLimits = {
  readonly maxFrameBytes: number;
  readonly maxCiphertextBytes: number;
};

export const DEFAULT_WA_NOISE_FRAME_LIMITS: WhatsAppNoiseFrameLimits =
  Object.freeze({
    maxFrameBytes: 8 * 1024 * 1024,
    maxCiphertextBytes: 8 * 1024 * 1024,
  });
