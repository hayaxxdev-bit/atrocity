import type { ProtocolNode } from "../../node/index.js";
import { MessageFeatureError } from "./message-errors.js";

export type TextMessageInput = {
  readonly id: string;
  readonly remoteJid: string;
  readonly text: string;
  readonly fromMe?: boolean;
  readonly participant?: string;
};

export class MessageNodeBuilder {
  buildText(input: TextMessageInput): ProtocolNode {
    validateTextMessage(input);

    const attrs: Record<string, string> = {
      id: input.id,
      to: input.remoteJid,
    };

    if (input.fromMe !== undefined) {
      attrs.from_me = input.fromMe ? "1" : "0";
    }

    if (input.participant) {
      attrs.participant = input.participant;
    }

    return Object.freeze({
      tag: "message",
      attrs: Object.freeze(attrs),
      content: Object.freeze([
        Object.freeze({
          tag: "body",
          attrs: Object.freeze({}),
          content: Object.freeze([input.text]),
        }),
      ]),
    });
  }
}

function validateTextMessage(input: TextMessageInput): void {
  if (!input.id || input.id.length > 256) {
    throw new MessageFeatureError(
      "MESSAGE_MISSING_ID",
      "Text message id must be non-empty and at most 256 characters.",
    );
  }

  if (!input.remoteJid || input.remoteJid.length > 512) {
    throw new MessageFeatureError(
      "MESSAGE_MISSING_REMOTE",
      "Text message remote JID must be non-empty and at most 512 characters.",
    );
  }

  if (
    typeof input.text !== "string" ||
    input.text.length === 0
  ) {
    throw new MessageFeatureError(
      "MESSAGE_UNSUPPORTED",
      "Text message body must be a non-empty string.",
    );
  }

  if (input.text.length > 65_536) {
    throw new MessageFeatureError(
      "MESSAGE_UNSUPPORTED",
      "Text message body exceeds the configured 64 KiB limit.",
    );
  }

  if (
    input.participant !== undefined &&
    input.participant.length === 0
  ) {
    throw new MessageFeatureError(
      "MESSAGE_UNSUPPORTED",
      "Participant cannot be an empty string.",
    );
  }
}
