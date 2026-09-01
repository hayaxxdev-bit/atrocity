import type { NoiseHandshakePattern } from "./handshake-pattern.js";
import type { NoiseProfile } from "./noise-types.js";

export type NoiseTargetProfile = {
  readonly id: string;
  readonly protocolName: string;
  readonly noiseHeader: Uint8Array;
  readonly noiseProfile: NoiseProfile;
  readonly handshakePattern: NoiseHandshakePattern;
};

export function createNoiseTargetProfile(
  profile: NoiseTargetProfile,
): NoiseTargetProfile {
  return Object.freeze({
    ...profile,
    noiseHeader: profile.noiseHeader.slice(),
    noiseProfile: Object.freeze({
      ...profile.noiseProfile,
      prologue: profile.noiseProfile.prologue.slice(),
    }),
    handshakePattern: Object.freeze({
      ...profile.handshakePattern,
      initiatorPreMessage: Object.freeze([
        ...profile.handshakePattern.initiatorPreMessage,
      ]),
      responderPreMessage: Object.freeze([
        ...profile.handshakePattern.responderPreMessage,
      ]),
      messages: Object.freeze(
        profile.handshakePattern.messages.map((m) => Object.freeze([...m])),
      ),
    }),
  });
}
