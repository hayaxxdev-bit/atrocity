export type ConnectionRecoveryState =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "reauthenticating"
  | "resyncing"
  | "failed";

export type ConnectionRecoveryReason =
  | "transport-closed"
  | "stream-closed"
  | "session-invalid"
  | "manual";

export type ConnectionRecoveryFailureCode =
  | "reconnect-failed"
  | "reauthentication-failed"
  | "resync-failed"
  | "resume-failed"
  | "invalid-transition";

export type ConnectionRecoveryEvent =
  | { type: "disconnect"; reason: ConnectionRecoveryReason }
  | { type: "reconnect-started" }
  | { type: "reconnect-succeeded"; requiresReauthentication?: boolean }
  | { type: "reconnect-failed"; error: unknown }
  | { type: "reauthentication-succeeded" }
  | { type: "reauthentication-failed"; error: unknown }
  | { type: "resync-succeeded" }
  | { type: "resync-failed"; error: unknown }
  | { type: "resume-failed"; error: unknown }
  | { type: "reset-to-connected" };

export type ConnectionRecoverySnapshot = {
  state: ConnectionRecoveryState;
  reason?: ConnectionRecoveryReason;
  failureCode?: ConnectionRecoveryFailureCode;
  attempt: number;
  lastError?: unknown;
};

export type ConnectionRecoveryDependencies = {
  reconnectTransport: (attempt: number) => Promise<void>;
  reauthenticate: () => Promise<void>;
  resync: () => Promise<void>;
  resumePendingMessages: () => Promise<void>;
};

export type ConnectionRecoveryResult =
  | {
      status: "recovered";
      snapshot: ConnectionRecoverySnapshot;
    }
  | {
      status: "failed";
      snapshot: ConnectionRecoverySnapshot;
    };
