import {
  DEFAULT_WHATSAPP_NOISE_PROFILE,
  type WhatsAppNoiseProfile,
} from "./whatsapp-noise-profile.js";

export type NoiseProfileValidation = {
  readonly valid: boolean;
  readonly issues: readonly string[];
};

export function validateWhatsAppNoiseProfile(
  profile: WhatsAppNoiseProfile = DEFAULT_WHATSAPP_NOISE_PROFILE,
): NoiseProfileValidation {
  const issues: string[] = [];

  if (profile.name !== "whatsapp") {
    issues.push("profile name must be whatsapp");
  }

  if (profile.handshakePattern !== "XX") {
    issues.push("handshake pattern must be XX");
  }

  if (profile.dh !== "25519") {
    issues.push("DH function must be 25519");
  }

  if (profile.cipher !== "AESGCM") {
    issues.push("cipher must be AESGCM");
  }

  if (profile.hash !== "SHA256") {
    issues.push("hash must be SHA256");
  }

  if (profile.header.byteLength !== 4) {
    issues.push("WhatsApp Noise header must be 4 bytes");
  }

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
