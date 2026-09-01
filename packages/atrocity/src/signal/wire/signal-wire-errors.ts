import { AtrocityError } from "../../foundation/errors/index.js";

export type SignalWireErrorCode =
  | "SIGNAL_WIRE_INVALID"
  | "SIGNAL_WIRE_MALFORMED"
  | "SIGNAL_WIRE_TOO_LARGE"
  | "SIGNAL_WIRE_UNSUPPORTED";

export class SignalWireError extends AtrocityError {
  constructor(
    code: SignalWireErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(code, message, options);
    this.name = "SignalWireError";
  }
}
