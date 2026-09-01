export type TransportState =
  | "idle"
  | "connecting"
  | "open"
  | "closing"
  | "closed"
  | "failed";

export type TransportCloseReason =
  | "requested"
  | "remote"
  | "error"
  | "replaced"
  | "unknown";

export type TransportCloseInfo = {
  readonly reason: TransportCloseReason;
  readonly code?: number;
  readonly message?: string;
};

export type TransportHandlers = {
  readonly onOpen?: () => void | Promise<void>;
  readonly onData?: (data: Uint8Array) => void | Promise<void>;
  readonly onClose?: (info: TransportCloseInfo) => void | Promise<void>;
  readonly onError?: (error: TransportError) => void | Promise<void>;
};
