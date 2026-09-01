import type { ErrorCode } from "./error-codes.js";

export interface AtrocityErrorOptions {
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>> | undefined;
}

/** Base error type for all public Atrocity failures. */
export class AtrocityError extends Error {
  readonly code: ErrorCode;
  readonly details?: Readonly<Record<string, unknown>> | undefined;

  constructor(code: ErrorCode, message: string, options: AtrocityErrorOptions = {}) {
    super(message);
    if (options.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        configurable: true,
        enumerable: false,
        value: options.cause,
        writable: true,
      });
    }
    this.name = "AtrocityError";
    this.code = code;
    this.details = options.details;
  }
}
