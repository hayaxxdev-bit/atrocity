export type WAMessageKey = {
  readonly remoteJid?: string;
  readonly fromMe?: boolean;
  readonly id?: string;
  readonly participant?: string;
};

export type WAMessage = {
  readonly key?: WAMessageKey;
  readonly message?: {
    readonly conversation?: string;
    readonly extendedTextMessage?: {
      readonly text?: string;
      readonly contextInfo?: {
        readonly mentionedJid?: readonly string[];
        readonly stanzaId?: string;
      };
    };
  };
  readonly messageTimestamp?: number;
  readonly pushName?: string;
};
