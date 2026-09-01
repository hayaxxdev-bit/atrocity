export type SignalWireHeader = {
  readonly ratchetKey: Uint8Array;
  readonly previousChainLength: number;
  readonly messageNumber: number;
};

export type SignalWireMessage = {
  readonly header: SignalWireHeader;
  readonly ciphertext: Uint8Array;
};

export type SignalWireDecodeLimits = {
  readonly maxMessageBytes: number;
  readonly maxCiphertextBytes: number;
};
export const DEFAULT_SIGNAL_WIRE_LIMITS: SignalWireDecodeLimits = Object.freeze({
  maxMessageBytes: 16 * 1024 * 1024,
  maxCiphertextBytes: 16 * 1024 * 1024,
});
