export type HealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown";

export type HealthComponentStatus =
  | "ok"
  | "warning"
  | "error"
  | "unknown";

export type HealthComponent = {
  readonly status: HealthComponentStatus;
  readonly score: number;
  readonly lastSuccessAt?: number;
  readonly lastFailureAt?: number;
  readonly consecutiveFailures: number;
  readonly latencyMs?: number;
};

export type ConnectionHealthSnapshot = {
  readonly timestamp: number;
  readonly status: HealthStatus;
  readonly score: number;
  readonly transport: HealthComponent;
  readonly noise: HealthComponent;
  readonly authentication: HealthComponent;
  readonly protocol: HealthComponent;
  readonly reconnects: {
    readonly attempts: number;
    readonly lastAttemptAt?: number;
  };
  readonly lastActivityAt?: number;
};
