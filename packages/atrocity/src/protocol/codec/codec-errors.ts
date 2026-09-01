export class ProtocolCodecError extends Error {
  readonly offset?: number;

  constructor(message: string, options: { offset?: number; cause?: unknown } = {}) {
    super(message, options);
    this.name = "ProtocolCodecError";
    this.offset = options.offset;
  }
}
