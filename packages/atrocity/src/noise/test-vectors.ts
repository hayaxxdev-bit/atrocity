import type { NoiseHandshakePattern } from "./handshake-pattern.js";

export type NoiseTestVector = {
  readonly name: string;
  readonly pattern: NoiseHandshakePattern;
  readonly prologue: Uint8Array;
  readonly messages: readonly Uint8Array[];
  readonly expectedHandshakeHash?: Uint8Array;
};

export function cloneTestVector(vector: NoiseTestVector): NoiseTestVector {
  return Object.freeze({
    ...vector,
    prologue: vector.prologue.slice(),
    messages: Object.freeze(vector.messages.map((message) => message.slice())),
    expectedHandshakeHash: vector.expectedHandshakeHash?.slice(),
  });
}
