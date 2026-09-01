export type ConnectionFailureKind =
  | "transport"
  | "stream"
  | "authentication"
  | "session"
  | "protocol"
  | "unknown";

export type ConnectionFailureCode =
  | "network"
  | "timeout"
  | "stream-closed"
  | "logged-out"
  | "bad-auth"
  | "session-invalid"
  | "protocol-error"
  | "server-shutdown"
  | "conflict"
  | "unknown";

export type ConnectionRecoveryAction =
  | "reconnect"
  | "reauthenticate"
  | "repair-session"
  | "terminal";

export type ConnectionCloseSignal = {
  kind: ConnectionFailureKind;
  code: ConnectionFailureCode;
  retryable: boolean;
  message?: string;
  cause?: unknown;
};

export type ClassifiedConnectionFailure = {
  action: ConnectionRecoveryAction;
  reason:
    | "transport-closed"
    | "stream-closed"
    | "session-invalid"
    | "protocol-failure"
    | "terminal";
  signal: ConnectionCloseSignal;
};
