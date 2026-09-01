export type ReconnectBackoffStrategy = "exponential" | "linear" | "constant";

export type ReconnectJitter = "none" | "full" | "equal";

export type ReconnectPolicyConfig = {
  strategy: ReconnectBackoffStrategy;
  initialDelayMs: number;
  maxDelayMs: number;
  maxAttempts?: number;
  multiplier: number;
  jitter: ReconnectJitter;
};

export type ReconnectAttempt = {
  attempt: number;
  delayMs: number;
};

export type ReconnectPolicySnapshot = {
  attempt: number;
  exhausted: boolean;
};

export type ReconnectPolicy = {
  next(attempt: number): ReconnectAttempt;
  isExhausted(attempt: number): boolean;
  reset(): void;
  snapshot(): ReconnectPolicySnapshot;
};
