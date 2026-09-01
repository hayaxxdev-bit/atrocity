import type { ConnectionEvent } from "./connection-events.js";
import type { ConnectionHealthSnapshot } from "./health-types.js";
import type { ConnectionSnapshot } from "./connection-types.js";

export type ConnectionDiagnosticReport = {
  readonly generatedAt: number;
  readonly connection: ConnectionSnapshot;
  readonly health: ConnectionHealthSnapshot;
  readonly recentEvents: readonly ConnectionEvent[];
};
