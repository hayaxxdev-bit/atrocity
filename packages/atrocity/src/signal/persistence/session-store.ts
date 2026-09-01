import type { SignalSessionRecord } from "./session-record.js";

export interface SignalSessionStore {
  load(sessionId: string): Promise<SignalSessionRecord | undefined>;
  save(record: SignalSessionRecord): Promise<void>;
  delete(sessionId: string): Promise<void>;
  list(): Promise<readonly string[]>;
}
