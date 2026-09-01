import { protocolNode, type ProtocolNode } from "../../protocol/node/index.js";

export type WhatsAppMessageEnvelopeOptions = {
  readonly version?: string;
  readonly additionalAttributes?: Readonly<Record<string, string>>;
};

export class WhatsAppMessageEnvelopeBuilder {
  constructor(
    private readonly options: WhatsAppMessageEnvelopeOptions = {},
  ) {}

  build(
    jid: string,
    encrypted: {
      readonly type: "msg" | "pkmsg";
      readonly ciphertext: Uint8Array;
    },
  ): ProtocolNode {
    return protocolNode(
      "to",
      {
        jid,
        ...(this.options.additionalAttributes ?? {}),
      },
      Object.freeze({
        kind: "nodes",
        value: Object.freeze([
          protocolNode(
            "enc",
            {
              v: this.options.version ?? "2",
              type: encrypted.type,
            },
            Object.freeze({
              kind: "binary",
              value: encrypted.ciphertext.slice(),
            }),
          ),
        ]),
      }),
    );
  }
}
