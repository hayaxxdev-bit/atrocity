import type { AuthenticationCredentials } from "../../auth/credentials/credential-types.js";
import type { ServerCapabilitySet } from "../sync/server-capability-types.js";
import type { SignalSessionRecord } from "../persistence/session-record.js";

export type SessionBootstrapState =
  | "no-session"
  | "loading"
  | "restoring"
  | "validated"
  | "active"
  | "corrupt"
  | "incompatible"
  | "failed";

export type ActiveSignalSession = {
  readonly sessionId: string;
  readonly credentials: AuthenticationCredentials;
  readonly record: SignalSessionRecord;
  readonly capabilities: ServerCapabilitySet;
};

export type SessionBootstrapResult = {
  readonly state: SessionBootstrapState;
  readonly created: boolean;
  readonly active?: ActiveSignalSession;
};
