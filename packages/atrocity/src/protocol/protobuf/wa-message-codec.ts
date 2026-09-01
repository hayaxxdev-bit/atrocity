import type { WAMessage } from "./wa-message-types.js";
import { WAMessageCodecError } from "./wa-message-codec-errors.js";

export type WAMessageBinaryCodec = {
  readonly encode: (message: WAMessage) => Uint8Array;
  readonly decode: (bytes: Uint8Array) => WAMessage;
};

export class WAMessageCodec {
  constructor(private readonly codec: WAMessageBinaryCodec) {}

  encode(message: WAMessage): Uint8Array {
    try {
      return this.codec.encode(message).slice();
    } catch (error) {
      throw new WAMessageCodecError("WA_MESSAGE_ENCODE_FAILED", "Failed to encode WAMessage.", { cause: error });
    }
  }

  decode(bytes: Uint8Array): WAMessage {
    try {
      return this.codec.decode(bytes);
    } catch (error) {
      throw new WAMessageCodecError("WA_MESSAGE_DECODE_FAILED", "Failed to decode WAMessage.", { cause: error });
    }
  }

  roundTrip(message: WAMessage): WAMessage {
    return this.decode(this.encode(message));
  }
}
