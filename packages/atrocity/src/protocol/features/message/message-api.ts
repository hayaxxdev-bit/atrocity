import type { ProtocolNode } from "../../node/index.js";
import { MessageIdGenerator } from "./message-id.js";
import {
  MessageNodeBuilder,
  type TextMessageInput,
} from "./message-builders.js";

export type MessageSendDelegate = {
  readonly sendNode: (node: ProtocolNode) => Promise<void>;
};

export type SendTextOptions = {
  readonly id?: string;
  readonly fromMe?: boolean;
  readonly participant?: string;
};

export class MessageApi {
  readonly ids: MessageIdGenerator;
  readonly builder: MessageNodeBuilder;

  constructor(
    private readonly transport: MessageSendDelegate,
    ids = new MessageIdGenerator(),
    builder = new MessageNodeBuilder(),
  ) {
    this.ids = ids;
    this.builder = builder;
  }

  async sendText(
    remoteJid: string,
    text: string,
    options: SendTextOptions = {},
  ): Promise<ProtocolNode> {
    const input: TextMessageInput = {
      id: options.id ?? this.ids.next(),
      remoteJid,
      text,
      ...(options.fromMe === undefined
        ? {}
        : { fromMe: options.fromMe }),
      ...(options.participant === undefined
        ? {}
        : { participant: options.participant }),
    };

    const node = this.builder.buildText(input);
    await this.transport.sendNode(node);
    return node;
  }
}
