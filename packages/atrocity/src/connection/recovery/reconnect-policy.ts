import type {
  ReconnectAttempt,
  ReconnectPolicy,
  ReconnectPolicyConfig,
  ReconnectPolicySnapshot,
} from "./reconnect-policy-types";

function validate(config: ReconnectPolicyConfig): void {
  if (!Number.isFinite(config.initialDelayMs) || config.initialDelayMs < 0) {
    throw new Error("initialDelayMs must be a non-negative finite number.");
  }

  if (!Number.isFinite(config.maxDelayMs) || config.maxDelayMs < config.initialDelayMs) {
    throw new Error("maxDelayMs must be finite and >= initialDelayMs.");
  }

  if (!Number.isFinite(config.multiplier) || config.multiplier < 1) {
    throw new Error("multiplier must be finite and >= 1.");
  }

  if (
    config.maxAttempts !== undefined &&
    (!Number.isInteger(config.maxAttempts) || config.maxAttempts < 1)
  ) {
    throw new Error("maxAttempts must be a positive integer when provided.");
  }
}

export class ExponentialReconnectPolicy implements ReconnectPolicy {
  private lastAttempt = 0;

  constructor(private readonly config: ReconnectPolicyConfig) {
    if (config.strategy !== "exponential") {
      throw new Error("ExponentialReconnectPolicy requires strategy=exponential.");
    }
    validate(config);
  }

  public next(attempt: number): ReconnectAttempt {
    if (!Number.isInteger(attempt) || attempt < 1) {
      throw new Error("attempt must be a positive integer.");
    }

    this.lastAttempt = attempt;

    if (this.isExhausted(attempt)) {
      return { attempt, delayMs: 0 };
    }

    const raw = this.config.initialDelayMs * Math.pow(this.config.multiplier, attempt - 1);
    const capped = Math.min(raw, this.config.maxDelayMs);

    return {
      attempt,
      delayMs: applyJitter(capped, this.config.jitter),
    };
  }

  public isExhausted(attempt: number): boolean {
    return (
      this.config.maxAttempts !== undefined &&
      attempt > this.config.maxAttempts
    );
  }

  public reset(): void {
    this.lastAttempt = 0;
  }

  public snapshot(): ReconnectPolicySnapshot {
    return {
      attempt: this.lastAttempt,
      exhausted: this.isExhausted(this.lastAttempt),
    };
  }
}

export class LinearReconnectPolicy implements ReconnectPolicy {
  private lastAttempt = 0;

  constructor(private readonly config: ReconnectPolicyConfig) {
    if (config.strategy !== "linear") {
      throw new Error("LinearReconnectPolicy requires strategy=linear.");
    }
    validate(config);
  }

  public next(attempt: number): ReconnectAttempt {
    if (!Number.isInteger(attempt) || attempt < 1) {
      throw new Error("attempt must be a positive integer.");
    }

    this.lastAttempt = attempt;

    if (this.isExhausted(attempt)) {
      return { attempt, delayMs: 0 };
    }

    const raw = Math.min(
      this.config.initialDelayMs * attempt,
      this.config.maxDelayMs,
    );

    return {
      attempt,
      delayMs: applyJitter(raw, this.config.jitter),
    };
  }

  public isExhausted(attempt: number): boolean {
    return (
      this.config.maxAttempts !== undefined &&
      attempt > this.config.maxAttempts
    );
  }

  public reset(): void {
    this.lastAttempt = 0;
  }

  public snapshot(): ReconnectPolicySnapshot {
    return {
      attempt: this.lastAttempt,
      exhausted: this.isExhausted(this.lastAttempt),
    };
  }
}

export class ConstantReconnectPolicy implements ReconnectPolicy {
  private lastAttempt = 0;

  constructor(private readonly config: ReconnectPolicyConfig) {
    if (config.strategy !== "constant") {
      throw new Error("ConstantReconnectPolicy requires strategy=constant.");
    }
    validate(config);
  }

  public next(attempt: number): ReconnectAttempt {
    if (!Number.isInteger(attempt) || attempt < 1) {
      throw new Error("attempt must be a positive integer.");
    }

    this.lastAttempt = attempt;

    if (this.isExhausted(attempt)) {
      return { attempt, delayMs: 0 };
    }

    return {
      attempt,
      delayMs: applyJitter(
        this.config.initialDelayMs,
        this.config.jitter,
      ),
    };
  }

  public isExhausted(attempt: number): boolean {
    return (
      this.config.maxAttempts !== undefined &&
      attempt > this.config.maxAttempts
    );
  }

  public reset(): void {
    this.lastAttempt = 0;
  }

  public snapshot(): ReconnectPolicySnapshot {
    return {
      attempt: this.lastAttempt,
      exhausted: this.isExhausted(this.lastAttempt),
    };
  }
}

export function createReconnectPolicy(
  config: ReconnectPolicyConfig,
): ReconnectPolicy {
  switch (config.strategy) {
    case "exponential":
      return new ExponentialReconnectPolicy(config);
    case "linear":
      return new LinearReconnectPolicy(config);
    case "constant":
      return new ConstantReconnectPolicy(config);
  }
}

function applyJitter(delayMs: number, jitter: ReconnectPolicyConfig["jitter"]): number {
  switch (jitter) {
    case "none":
      return Math.round(delayMs);
    case "full":
      return Math.floor(Math.random() * (delayMs + 1));
    case "equal":
      return Math.floor(delayMs / 2 + Math.random() * (delayMs / 2 + 1));
  }
}
