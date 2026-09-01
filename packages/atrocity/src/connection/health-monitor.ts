import type {
  ConnectionEvent,
  ConnectionEventBus,
} from "./connection-events.js";
import type {
  ConnectionHealthSnapshot,
  HealthComponent,
} from "./health-types.js";

type MutableComponent = {
  status: HealthComponent["status"];
  score: number;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  consecutiveFailures: number;
  latencyMs?: number;
};

export class ConnectionHealthMonitor {
  private readonly components: {
    transport: MutableComponent;
    noise: MutableComponent;
    authentication: MutableComponent;
    protocol: MutableComponent;
  } = {
    transport: component(),
    noise: component(),
    authentication: component(),
    protocol: component(),
  };

  private reconnectAttempts = 0;
  private lastReconnectAt?: number;
  private lastActivityAt?: number;

  constructor(
    private readonly events: ConnectionEventBus,
  ) {
    events.subscribe((event) => this.consume(event));
  }

  snapshot(now = Date.now()): ConnectionHealthSnapshot {
    const transport = immutable(this.components.transport);
    const noise = immutable(this.components.noise);
    const authentication = immutable(this.components.authentication);
    const protocol = immutable(this.components.protocol);

    const score = Math.round(
      (
        transport.score +
        noise.score +
        authentication.score +
        protocol.score
      ) / 4,
    );

    return Object.freeze({
      timestamp: now,
      status: classify(score, this.lastActivityAt, now),
      score,
      transport,
      noise,
      authentication,
      protocol,
      reconnects: Object.freeze({
        attempts: this.reconnectAttempts,
        ...(this.lastReconnectAt === undefined
          ? {}
          : { lastAttemptAt: this.lastReconnectAt }),
      }),
      ...(this.lastActivityAt === undefined
        ? {}
        : { lastActivityAt: this.lastActivityAt }),
    });
  }

  private consume(event: ConnectionEvent): void {
    this.lastActivityAt = event.timestamp;

    switch (event.type) {
      case "connection.socket-open":
        markSuccess(this.components.transport, event);
        return;

      case "connection.noise-handshake":
        markSuccess(this.components.transport, event);
        markAttempt(this.components.noise, event);
        return;

      case "connection.authenticating":
        markSuccess(this.components.noise, event);
        markAttempt(this.components.authentication, event);
        return;

      case "connection.encrypted":
        markSuccess(this.components.authentication, event);
        return;

      case "connection.syncing":
      case "connection.ready":
        markSuccess(this.components.protocol, event);
        return;

      case "connection.reconnecting":
        this.reconnectAttempts += 1;
        this.lastReconnectAt = event.timestamp;
        return;

      case "connection.failed":
        applyFailure(this.componentForFailure(event), event);
        return;

      case "connection.closed":
        this.components.transport.status = "unknown";
        this.components.transport.score = Math.min(
          this.components.transport.score,
          50,
        );
        return;

      default:
        return;
    }
  }

  private componentForFailure(
    event: ConnectionEvent,
  ): MutableComponent {
    const reason = event.failure?.reason?.toLowerCase() ?? "";

    if (reason.includes("transport")) return this.components.transport;
    if (reason.includes("noise")) return this.components.noise;
    if (reason.includes("auth")) return this.components.authentication;
    return this.components.protocol;
  }
}

function component(): MutableComponent {
  return {
    status: "unknown",
    score: 50,
    consecutiveFailures: 0,
  };
}

function immutable(componentValue: MutableComponent): HealthComponent {
  return Object.freeze({
    status: componentValue.status,
    score: Math.max(0, Math.min(100, componentValue.score)),
    ...(componentValue.lastSuccessAt === undefined
      ? {}
      : { lastSuccessAt: componentValue.lastSuccessAt }),
    ...(componentValue.lastFailureAt === undefined
      ? {}
      : { lastFailureAt: componentValue.lastFailureAt }),
    consecutiveFailures: componentValue.consecutiveFailures,
    ...(componentValue.latencyMs === undefined
      ? {}
      : { latencyMs: componentValue.latencyMs }),
  });
}

function markAttempt(
  componentValue: MutableComponent,
  event: ConnectionEvent,
): void {
  if (componentValue.lastSuccessAt !== undefined) {
    componentValue.latencyMs =
      Math.max(0, event.timestamp - componentValue.lastSuccessAt);
  }
}

function markSuccess(
  componentValue: MutableComponent,
  event: ConnectionEvent,
): void {
  componentValue.status = "ok";
  componentValue.score = Math.min(
    100,
    componentValue.score + 10,
  );
  componentValue.lastSuccessAt = event.timestamp;
  componentValue.consecutiveFailures = 0;
}

function applyFailure(
  componentValue: MutableComponent,
  event: ConnectionEvent,
): void {
  componentValue.status = "error";
  componentValue.score = Math.max(
    0,
    componentValue.score - 30,
  );
  componentValue.lastFailureAt = event.timestamp;
  componentValue.consecutiveFailures += 1;
}

function classify(
  score: number,
  lastActivityAt: number | undefined,
  now: number,
): ConnectionHealthSnapshot["status"] {
  if (lastActivityAt === undefined) return "unknown";

  const idleMs = Math.max(0, now - lastActivityAt);

  if (score >= 80 && idleMs < 120_000) return "healthy";
  if (score >= 50 && idleMs < 300_000) return "degraded";
  if (score >= 0 && idleMs < 900_000) return "unhealthy";

  return "unknown";
}
