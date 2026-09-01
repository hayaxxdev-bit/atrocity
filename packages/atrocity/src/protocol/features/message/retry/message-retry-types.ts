export type MessageRetryReason =
  | "server-retry"
  | "decryption-failure"
  | "session-missing"
  | "unknown";

export type MessageRetryState =
  | "created"
  | "inspecting"
  | "session-repairing"
  | "re-encrypting"
  | "resending"
  | "completed"
  | "failed";

export type MessageRetryRequest = {
  readonly messageId: string;
  readonly remoteJid: string;
  readonly reason: MessageRetryReason;
  readonly plaintext: Uint8Array;
};

export type MessageRetryResult = {
  readonly state: "completed";
  readonly messageId: string;
  readonly reEncrypted: true;
  readonly sessionRebuilt: boolean;
};
