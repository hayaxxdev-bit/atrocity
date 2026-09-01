export type InboundSignalMessageType = "msg" | "pkmsg";

export type InboundEncryptedMessage = {
  readonly remoteJid: string;
  readonly type: InboundSignalMessageType;
  readonly ciphertext: Uint8Array;
  readonly messageNode: import("../../../node/index.js").ProtocolNode;
};

export type InboundDecryptionResult = {
  readonly status: "decrypted";
  readonly remoteJid: string;
  readonly plaintext: Uint8Array;
  readonly type: InboundSignalMessageType;
};
