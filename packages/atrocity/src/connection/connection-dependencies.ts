import type { ConnectionEventBus } from "./connection-events.js";

export type ConnectionDependencies = {
  readonly transport: {
    readonly state: string;
    connect(): Promise<void>;
    close(): Promise<void>;
  };

  readonly handshake: {
    run(): Promise<void>;
  };

  readonly authenticate: {
    run(): Promise<void>;
  };

  readonly protocol: {
    start(): Promise<void>;
    stop(): Promise<void>;
  };
  readonly protocolLifecycle?: {
    readonly startEncryptedProtocol(): Promise<void>;
    readonly stopEncryptedProtocol(): Promise<void>;
  };

  readonly sync?: {
    run(): Promise<void>;
  };

  readonly delay?: (ms: number) => Promise<void>;
  readonly events?: ConnectionEventBus;
  readonly connectionId?: string;
  readonly reconnectPolicy?: {
    readonly maxAttempts: number;
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
  };
};
