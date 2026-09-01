import type { WAMessage } from "./wa-message-types.js";
import { WAMessageCodecError } from "./wa-message-codec-errors.js";

export function normalizeWAMessage(message: WAMessage): WAMessage {
  const key = message.key;
  if (!key?.remoteJid || !key.id) {
    throw new WAMessageCodecError(
      "WA_MESSAGE_INVALID",
      "Outbound WAMessage requires key.remoteJid and key.id.",
    );
  }

  return Object.freeze({
    ...message,
    key: Object.freeze({
      ...key,
      fromMe: key.fromMe ?? true,
    }),
  });
}
