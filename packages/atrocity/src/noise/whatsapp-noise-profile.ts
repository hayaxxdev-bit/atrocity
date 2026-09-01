export const WHATSAPP_NOISE_HEADER = new Uint8Array([
  87, 65, 6, 3,
]);

export const WHATSAPP_NOISE_MODE =
  "Noise_XX_25519_AESGCM_SHA256\\0\\0\\0\\0";

export type WhatsAppNoiseProfile = {
  readonly name: "whatsapp";
  readonly mode: string;
  readonly header: Uint8Array;
  readonly protocolVersion: number;
  readonly cipher: "AESGCM";
  readonly hash: "SHA256";
  readonly dh: "25519";
  readonly handshakePattern: "XX";
};

export const DEFAULT_WHATSAPP_NOISE_PROFILE: WhatsAppNoiseProfile =
  Object.freeze({
    name: "whatsapp",
    mode: WHATSAPP_NOISE_MODE,
    header: WHATSAPP_NOISE_HEADER.slice(),
    protocolVersion: 3,
    cipher: "AESGCM",
    hash: "SHA256",
    dh: "25519",
    handshakePattern: "XX",
  });
