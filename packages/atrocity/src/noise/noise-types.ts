import type { CryptoProvider } from "../crypto/index.js";

export type NoiseRole = "initiator" | "responder";

export type NoiseCipherState = {
  readonly key: Uint8Array;
  readonly nonce: bigint;
};

export type NoiseHandshakeResult = {
  readonly sendCipherKey: Uint8Array;
  readonly receiveCipherKey: Uint8Array;
  readonly handshakeHash: Uint8Array;
};

export type NoiseProfile = {
  readonly name: string;
  readonly hash: "SHA-256" | "SHA-512";
  readonly cipher: "AES-256-GCM";
  readonly dh: "X25519";
  readonly prologue: Uint8Array;
};

export type NoiseKeyPair = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type NoiseDependencies = {
  readonly crypto: CryptoProvider;
  readonly profile: NoiseProfile;
};
