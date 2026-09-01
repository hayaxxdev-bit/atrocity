import type { DoubleRatchetState, ChainKeyState, RatchetKeyPair } from "../ratchet/index.js";

export const SIGNAL_SESSION_SCHEMA_VERSION = 1;

export type PersistedSkippedMessageKey = {
  readonly ratchetPublicKey: Uint8Array;
  readonly messageNumber: bigint;
  readonly messageKey: Uint8Array;
};

export type SignalSessionRecord = {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly associatedData: Uint8Array;
  readonly ratchet: DoubleRatchetState;
  readonly skippedMessageKeys: readonly PersistedSkippedMessageKey[];
};

export type SignalSessionSnapshot = {
  readonly sessionId: string;
  readonly associatedData: Uint8Array;
  readonly ratchet: DoubleRatchetState;
  readonly skippedMessageKeys: readonly PersistedSkippedMessageKey[];
};
