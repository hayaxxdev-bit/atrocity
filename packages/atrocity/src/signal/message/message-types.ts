export type SignalMessageHeader = {
  readonly ratchetPublicKey: Uint8Array;
  readonly previousChainLength: bigint;
  readonly messageNumber: bigint;
};

export type SignalCiphertext = {
  readonly header: SignalMessageHeader;
  readonly ciphertext: Uint8Array;
};

export type SignalPlaintextMessage = {
  readonly header: SignalMessageHeader;
  readonly plaintext: Uint8Array;
};
