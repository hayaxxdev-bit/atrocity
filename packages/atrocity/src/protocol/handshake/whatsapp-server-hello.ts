import type { ServerHello } from "./handshake-types.js";
import { NoiseError } from "../../noise/noise-errors.js";

export function validateWhatsAppServerHello(message: ServerHello): void {
  if (!(message.ephemeral instanceof Uint8Array) || message.ephemeral.byteLength !== 32) {
    throw new NoiseError("NOISE_INVALID_INPUT", "WhatsApp ServerHello ephemeral must be exactly 32 bytes.");
  }
  if (!(message.static instanceof Uint8Array) || message.static.byteLength < 16) {
    throw new NoiseError("NOISE_INVALID_INPUT", "WhatsApp ServerHello static payload is missing or too short.");
  }
  if (!(message.payload instanceof Uint8Array) || message.payload.byteLength < 16) {
    throw new NoiseError("NOISE_INVALID_INPUT", "WhatsApp ServerHello certificate payload is missing or too short.");
  }
}
