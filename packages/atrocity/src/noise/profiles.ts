import type { NoiseProfile } from "./noise-types.js";
import {
  createHandshakePattern,
  type NoiseHandshakePattern,
} from "./handshake-pattern.js";

export const TEST_NOISE_PROFILE: NoiseProfile = Object.freeze({
  name: "test",
  hash: "SHA-256",
  cipher: "AES-256-GCM",
  dh: "X25519",
  prologue: new Uint8Array(0),
});

export const TEST_NN_PATTERN: NoiseHandshakePattern =
  createHandshakePattern({
    name: "NN",
    initiatorPreMessage: [],
    responderPreMessage: [],
    messages: [
      ["e"],
      ["e", "ee"],
    ],
  });

export const TEST_XX_PATTERN: NoiseHandshakePattern =
  createHandshakePattern({
    name: "XX",
    initiatorPreMessage: [],
    responderPreMessage: [],
    messages: [
      ["e"],
      ["e", "ee", "s", "es"],
      ["s", "se"],
    ],
  });
