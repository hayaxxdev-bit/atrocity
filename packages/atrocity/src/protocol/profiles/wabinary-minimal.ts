import { createWABinaryProfile } from "../codec/wabinary-profile.js";

/**
 * Initial development profile.
 *
 * The control-tag byte values match the current Baileys WABinary
 * constants. Vocabulary is intentionally limited to protocol-neutral
 * terms used by codec tests; the full production token dictionary will
 * be introduced as a versioned protocol profile after validation.
 */
const tokens = [
  undefined,
  "iq",
  "message",
  "type",
  "id",
  "to",
  "from",
  "participant",
  "recipient",
] as const;

const map = new Map<string, number>();
for (let i = 1; i < tokens.length; i++) {
  const token = tokens[i];
  if (token) map.set(token, i);
}

export const MINIMAL_WABINARY_PROFILE = createWABinaryProfile(tokens, map);
