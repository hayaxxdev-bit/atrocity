import type {
  ConnectionEvent,
  ConnectionEventBus,
} from "./connection-events.js";
import type { ConnectionRuntime } from "./connection-types.js";
import type { ConnectionDiagnosticReport } from "./diagnostics-types.js";
import { ConnectionHealthMonitor } from "./health-monitor.js";

export class ConnectionDiagnostics {
  private readonly history: ConnectionEvent[] = [];
  readonly health: ConnectionHealthMonitor;

  constructor(
    events: ConnectionEventBus,
    private readonly connection: ConnectionRuntime,
    private readonly maxEvents = 100,
  ) {
    if (!Number.isSafeInteger(maxEvents) || maxEvents <= 0) {
      throw new RangeError("Diagnostic history size must be positive.");
    }

    this.health = new ConnectionHealthMonitor(events);

    events.subscribe((event) => {
      this.history.push(event);
      if (this.history.length > this.maxEvents) {
        this.history.splice(
          0,
          this.history.length - this.maxEvents,
        );
      }
    });
  }

  report(now = Date.now()): ConnectionDiagnosticReport {
    return Object.freeze({
      generatedAt: now,
      connection: this.connection.snapshot(),
      health: this.health.snapshot(now),
      recentEvents: Object.freeze(
        this.history.map(cloneEvent),
      ),
    });
  }
}

function cloneEvent(event: ConnectionEvent): ConnectionEvent {
  return Object.freeze({
    ...event,
    ...(event.failure
      ? {
          failure: Object.freeze({
            reason: event.failure.reason,
            error: event.failure.error,
          }),
        }
      : {}),
  });
}
