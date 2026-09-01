import { createHandshakePattern } from "./handshake-pattern.js";
import {
  createNoiseTargetProfile,
  type NoiseTargetProfile,
} from "./target-profile.js";

/**
 * Current Baileys reference values:
 * NOISE_MODE = Noise_XX_25519_AESGCM_SHA256 + four NUL bytes
 * NOISE_WA_HEADER = [87, 65, 6, DICT_VERSION]
 * DICT_VERSION currently = 3.
 *
 * These are isolated from the generic Noise engine. The exact WhatsApp
 * prologue and complete handshake transcript are intentionally left
 * explicit until end-to-end interoperability is verified.
 */
export const WHATSAPP_NOISE_MODE =
  "Noise_XX_25519_AESGCM_SHA256\0\0\0\0";

export const WHATSAPP_NOISE_HEADER = new Uint8Array([
  87, 65, 6, 3,
]);

export const WHATSAPP_NOISE_PROFILE: NoiseTargetProfile =
  createNoiseTargetProfile({
    id: "whatsapp-web-current-reference",
    protocolName: WHATSAPP_NOISE_MODE,
    noiseHeader: WHATSAPP_NOISE_HEADER,
    noiseProfile: {
      name: "XX",
      hash: "SHA-256",
      cipher: "AES-256-GCM",
      dh: "X25519",
      prologue: new Uint8Array(0),
    },
    handshakePattern: createHandshakePattern({
      name: "XX",
      initiatorPreMessage: [],
      responderPreMessage: [],
      messages: [
        ["e"],
        ["e", "ee", "s", "es"],
        ["s", "se"],
      ],
    }),
  });
