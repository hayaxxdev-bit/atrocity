export type ConnectionState =
  | "created"
  | "connecting"
  | "socket-open"
  | "noise-handshake"
  | "authenticating"
  | "encrypted"
  | "syncing"
  | "ready"
  | "reconnecting"
  | "closing"
  | "closed"
  | "failed";

export type ConnectionFailureReason =
  | "transport"
  | "noise"
  | "authentication"
  | "protocol"
  | "persistence"
  | "timeout"
  | "unknown";

export type ConnectionSnapshot = {
  readonly state: ConnectionState;
  readonly reconnectAttempt: number;
  readonly lastFailure?: {
    readonly reason: ConnectionFailureReason;
    readonly error: unknown;
  };
};

export type ConnectionRuntime = {
  readonly connect(): Promise<void>;
  readonly close(): Promise<void>;
  readonly snapshot(): ConnectionSnapshot;
};
