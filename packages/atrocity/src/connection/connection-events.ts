export type ConnectionEventType =
  | "connection.created"
  | "connection.connecting"
  | "connection.socket-open"
  | "connection.noise-handshake"
  | "connection.authenticating"
  | "connection.encrypted"
  | "connection.syncing"
  | "connection.ready"
  | "connection.reconnecting"
  | "connection.failed"
  | "connection.closing"
  | "connection.closed";

export type ConnectionEventBase = {
  readonly sequence: number;
  readonly timestamp: number;
  readonly connectionId: string;
  readonly attempt: number;
};

export type ConnectionEvent = ConnectionEventBase & {
  readonly type: ConnectionEventType;
  readonly previousState: string;
  readonly currentState: string;
  readonly durationMs?: number;
  readonly failure?: {
    readonly reason: string;
    readonly error: unknown;
  };
};

export type ConnectionEventListener = (
  event: ConnectionEvent,
) => void | Promise<void>;

export type ConnectionEventBus = {
  subscribe(listener: ConnectionEventListener): () => void;
  publish(event: ConnectionEvent): Promise<void>;
};
