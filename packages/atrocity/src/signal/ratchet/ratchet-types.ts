export type RatchetRole = "initiator" | "responder";

export type RatchetKeyPair = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type ChainKeyState = {
  readonly key: Uint8Array;
  readonly index: bigint;
};

export type RootKeyState = {
  readonly key: Uint8Array;
  readonly generation: number;
};

export type MessageKey = {
  readonly key: Uint8Array;
  readonly index: bigint;
};

export type DoubleRatchetState = {
  readonly rootKey: RootKeyState;
  readonly sendingChain?: ChainKeyState;
  readonly receivingChain?: ChainKeyState;
  readonly sendRatchetKey?: RatchetKeyPair;
  readonly remoteRatchetPublicKey?: Uint8Array;
  readonly sendCount: bigint;
  readonly receiveCount: bigint;
  readonly previousSendingChainLength: bigint;
};
