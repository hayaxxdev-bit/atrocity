import type { HandshakeMessage } from "./handshake-types.js";
import {
  buildWhatsAppClientFinish,
  type ClientFinishInput,
} from "./whatsapp-client-finish.js";

export type ClientFinishCodec = {
  readonly encode: (message: HandshakeMessage) => Uint8Array;
};

export class WhatsAppClientFinish {
  constructor(
    private readonly codec: ClientFinishCodec,
  ) {}

  build(input: ClientFinishInput): HandshakeMessage {
    return buildWhatsAppClientFinish(input);
  }

  encode(input: ClientFinishInput): Uint8Array {
    return this.codec.encode(this.build(input));
  }
}
