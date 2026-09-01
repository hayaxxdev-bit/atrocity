export type SignalEncryptResult = {
  readonly type: "msg" | "pkmsg";
  readonly ciphertext: Uint8Array;
};

export type WhatsAppEncryptedMessage = {
  readonly jid: string;
  readonly signalType: "msg" | "pkmsg";
  readonly ciphertext: Uint8Array;
};
