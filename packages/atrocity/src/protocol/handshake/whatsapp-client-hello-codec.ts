import type { HandshakeMessage } from "./handshake-types.js";
import {
  buildWhatsAppClientHello,
  type ClientHelloInput,
} from "./whatsapp-client-hello.js";

export type ClientHelloCodec = {
  readonly encode: (message: HandshakeMessage) => Uint8Array;
};

export class WhatsAppClientHello {
  constructor(
    private readonly codec: ClientHelloCodec,
  ) {}

  build(
    input: ClientHelloInput,
  ): HandshakeMessage {
    return buildWhatsAppClientHello(input);
  }

  encode(
    input: ClientHelloInput,
  ): Uint8Array {
    return this.codec.encode(
      this.build(input),
    );
  }
}
