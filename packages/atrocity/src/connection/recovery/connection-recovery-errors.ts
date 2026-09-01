export class ConnectionRecoveryError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ConnectionRecoveryError";
    this.cause = cause;
  }
}
