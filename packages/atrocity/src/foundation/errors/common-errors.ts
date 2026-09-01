import { AtrocityError, type AtrocityErrorOptions } from "./atrocity-error.js";
import { ErrorCode } from "./error-codes.js";

export class InvalidArgumentError extends AtrocityError {
  constructor(message: string, options: AtrocityErrorOptions = {}) {
    super(ErrorCode.INVALID_ARGUMENT, message, options);
    this.name = "InvalidArgumentError";
  }
}

export class InvalidStateError extends AtrocityError {
  constructor(message: string, options: AtrocityErrorOptions = {}) {
    super(ErrorCode.INVALID_STATE, message, options);
    this.name = "InvalidStateError";
  }
}

export class TimeoutError extends AtrocityError {
  constructor(message = "The operation timed out.", options: AtrocityErrorOptions = {}) {
    super(ErrorCode.TIMEOUT, message, options);
    this.name = "TimeoutError";
  }
}

export class CancelledError extends AtrocityError {
  constructor(message = "The operation was cancelled.", options: AtrocityErrorOptions = {}) {
    super(ErrorCode.CANCELLED, message, options);
    this.name = "CancelledError";
  }
}
