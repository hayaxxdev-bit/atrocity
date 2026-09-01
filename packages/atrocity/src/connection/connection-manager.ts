import { ConnectionError } from "./connection-errors.js";
import type { ConnectionDependencies } from "./connection-dependencies.js";
import type {
  ConnectionEvent,
  ConnectionEventType,
} from "./connection-events.js";
import { InMemoryConnectionEventBus } from "./connection-event-bus.js";
import type {
  ConnectionFailureReason,
  ConnectionRuntime,
  ConnectionSnapshot,
  ConnectionState,
} from "./connection-types.js";

const DEFAULT_RECONNECT_POLICY = Object.freeze({
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
});

const stateToEvent: Partial<Record<ConnectionState, ConnectionEventType>> = {
  created: "connection.created",
  connecting: "connection.connecting",
  "socket-open": "connection.socket-open",
  "noise-handshake": "connection.noise-handshake",
  authenticating: "connection.authenticating",
  encrypted: "connection.encrypted",
  syncing: "connection.syncing",
  ready: "connection.ready",
  reconnecting: "connection.reconnecting",
  closing: "connection.closing",
  closed: "connection.closed",
  failed: "connection.failed",
};

export class ConnectionManager implements ConnectionRuntime {
  private stateValue: ConnectionState = "created";
  private reconnectAttemptValue = 0;
  private failure?: ConnectionSnapshot["lastFailure"];
  private connectPromise?: Promise<void>;
  private closing = false;
  private sequence = 0;
  private stateEnteredAt = Date.now();

  private readonly policy;
  private readonly connectionId: string;
  private readonly events: InMemoryConnectionEventBus | NonNullable<ConnectionDependencies["events"]>;

  constructor(
    private readonly dependencies: ConnectionDependencies,
  ) {
    this.policy = Object.freeze({
      ...DEFAULT_RECONNECT_POLICY,
      ...(dependencies.reconnectPolicy ?? {}),
    });

    this.connectionId = dependencies.connectionId ??
      `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    this.events = dependencies.events ?? new InMemoryConnectionEventBus();

    void this.emitStateEvent("created", undefined, true);
  }

  get eventBus() {
    return this.events;
  }

  snapshot(): ConnectionSnapshot {
    return Object.freeze({
      state: this.stateValue,
      reconnectAttempt: this.reconnectAttemptValue,
      ...(this.failure ? { lastFailure: this.failure } : {}),
    });
  }

  async connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.connectInternal();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = undefined;
    }
  }

  async close(): Promise<void> {
    if (
      this.stateValue === "closed" ||
      this.stateValue === "created"
    ) {
      if (this.stateValue === "created") {
        this.transition("closing");
        this.transition("closed");
      }
      return;
    }

    if (this.stateValue !== "closing") {
      this.transition("closing");
    }

    this.closing = true;

    try {
      if (this.dependencies.protocolLifecycle) {
        await this.dependencies.protocolLifecycle.stopEncryptedProtocol();
      } else {
        await this.dependencies.protocol.stop();
      }
    } catch (error) {
      throw new ConnectionError(
        "CONNECTION_CLOSE_FAILED",
        "Failed to stop protocol stream.",
        { cause: error },
      );
    }

    try {
      await this.dependencies.transport.close();
    } catch (error) {
      throw new ConnectionError(
        "CONNECTION_CLOSE_FAILED",
        "Failed to close transport.",
        { cause: error },
      );
    }

    this.transition("closed");
  }

  async reconnect(): Promise<void> {
    if (this.closing) {
      throw new ConnectionError(
        "CONNECTION_INVALID_STATE",
        "Cannot reconnect while closing.",
      );
    }

    if (this.stateValue !== "reconnecting") {
      this.transition("reconnecting");
    }

    for (
      this.reconnectAttemptValue = 1;
      this.reconnectAttemptValue <= this.policy.maxAttempts;
      this.reconnectAttemptValue += 1
    ) {
      const delayMs = this.calculateBackoff(
        this.reconnectAttemptValue,
      );

      await this.getDelay(delayMs);

      try {
        this.transition("connecting");
        await this.connectInternal(true);
        return;
      } catch (error) {
        this.recordFailure("unknown", error);

        if (
          this.reconnectAttemptValue >=
          this.policy.maxAttempts
        ) {
          this.transition("failed");
          throw new ConnectionError(
            "CONNECTION_RECONNECT_FAILED",
            "Connection could not be re-established.",
            { cause: error },
          );
        }

        this.transition("reconnecting");
      }
    }
  }

  private async connectInternal(
    fromReconnect = false,
  ): Promise<void> {
    if (
      !fromReconnect &&
      this.stateValue !== "created" &&
      this.stateValue !== "closed"
    ) {
      throw new ConnectionError(
        "CONNECTION_INVALID_STATE",
        `Cannot connect from state ${this.stateValue}.`,
      );
    }

    this.closing = false;
    this.failure = undefined;

    try {
      this.transition("connecting");

      await this.dependencies.transport.connect();
      this.transition("socket-open");

      this.transition("noise-handshake");
      await this.dependencies.handshake.run();

      this.transition("authenticating");
      await this.dependencies.authenticate.run();

      this.transition("encrypted");
      if (this.dependencies.protocolLifecycle) {
        await this.dependencies.protocolLifecycle.startEncryptedProtocol();
      } else {
        await this.dependencies.protocol.start();
      }

      if (this.dependencies.sync) {
        this.transition("syncing");
        await this.dependencies.sync.run();
      }

      this.transition("ready");

      if (!fromReconnect) {
        this.reconnectAttemptValue = 0;
      }
    } catch (error) {
      const reason = classifyFailure(error);
      this.recordFailure(reason, error);
      this.transition("failed");
      throw new ConnectionError(
        "CONNECTION_CONNECT_FAILED",
        `Connection failed during ${this.stateValue}.`,
        { cause: error },
      );
    }
  }

  private transition(next: ConnectionState): void {
    const previous = this.stateValue;

    const allowed: Record<
      ConnectionState,
      readonly ConnectionState[]
    > = {
      created: ["connecting", "closing", "closed"],
      connecting: ["socket-open", "failed", "closing"],
      "socket-open": ["noise-handshake", "failed", "closing"],
      "noise-handshake": ["authenticating", "failed", "closing"],
      authenticating: ["encrypted", "failed", "closing"],
      encrypted: ["syncing", "ready", "failed", "closing"],
      syncing: ["ready", "failed", "closing"],
      ready: ["reconnecting", "closing", "failed"],
      reconnecting: ["connecting", "failed", "closing"],
      closing: ["closed", "failed"],
      closed: ["connecting"],
      failed: ["reconnecting", "connecting", "closed"],
    };

    if (!allowed[previous].includes(next)) {
      throw new ConnectionError(
        "CONNECTION_INVALID_STATE",
        `Invalid connection transition ${previous} → ${next}.`,
      );
    }

    this.stateValue = next;
    void this.emitStateEvent(next, previous);
  }

  private async emitStateEvent(
    state: ConnectionState,
    previousState: string | undefined,
    initial = false,
  ): Promise<void> {
    const type = stateToEvent[state];
    if (!type) return;

    const now = Date.now();
    const durationMs = initial
      ? undefined
      : Math.max(0, now - this.stateEnteredAt);

    this.stateEnteredAt = now;
    this.sequence += 1;

    const event: ConnectionEvent = Object.freeze({
      sequence: this.sequence,
      timestamp: now,
      connectionId: this.connectionId,
      attempt: this.reconnectAttemptValue,
      type,
      previousState: previousState ?? "none",
      currentState: state,
      ...(durationMs === undefined ? {} : { durationMs }),
      ...(state === "failed" && this.failure
        ? {
            failure: Object.freeze({
              reason: this.failure.reason,
              error: this.failure.error,
            }),
          }
        : {}),
    });

    await this.events.publish(event);
  }

  private calculateBackoff(attempt: number): number {
    const exponential =
      this.policy.baseDelayMs *
      2 ** Math.max(0, attempt - 1);

    const jitter = Math.floor(Math.random() * 250);

    return Math.min(
      this.policy.maxDelayMs,
      exponential + jitter,
    );
  }

  private async getDelay(ms: number): Promise<void> {
    if (this.dependencies.delay) {
      await this.dependencies.delay(ms);
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private recordFailure(
    reason: ConnectionFailureReason,
    error: unknown,
  ): void {
    this.failure = Object.freeze({
      reason,
      error,
    });
  }
}

function classifyFailure(
  error: unknown,
): ConnectionFailureReason {
  const name = error instanceof Error
    ? error.name.toLowerCase()
    : "";

  const message = error instanceof Error
    ? error.message.toLowerCase()
    : String(error).toLowerCase();

  if (
    name.includes("transport") ||
    message.includes("transport")
  ) {
    return "transport";
  }

  if (
    name.includes("noise") ||
    message.includes("noise")
  ) {
    return "noise";
  }

  if (
    name.includes("auth") ||
    message.includes("authentication")
  ) {
    return "authentication";
  }

  if (
    name.includes("persist") ||
    message.includes("persist")
  ) {
    return "persistence";
  }

  if (
    name.includes("timeout") ||
    message.includes("timed out")
  ) {
    return "timeout";
  }

  return "protocol";
}
