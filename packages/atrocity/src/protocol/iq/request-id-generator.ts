export type RequestIdGeneratorOptions = {
  readonly prefix?: string;
  readonly randomBytes?: (length: number) => Uint8Array;
  readonly now?: () => number;
};

export class RequestIdGenerator {
  private counter = 0;
  private readonly prefix: string;
  private readonly randomBytes: (length: number) => Uint8Array;
  private readonly now: () => number;

  constructor(
    options: RequestIdGeneratorOptions = {},
  ) {
    this.prefix = sanitizePrefix(options.prefix ?? "atrocity");
    this.randomBytes =
      options.randomBytes ?? defaultRandomBytes;
    this.now = options.now ?? Date.now;
  }

  next(): string {
    this.counter += 1;

    const time = this.now().toString(36);
    const count = this.counter.toString(36);
    const random = bytesToBase64Url(
      this.randomBytes(6),
    );

    return `${this.prefix}-${time}-${count}-${random}`;
  }
}

function sanitizePrefix(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "-");

  return sanitized || "atrocity";
}

function defaultRandomBytes(length: number): Uint8Array {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  return new Uint8Array(crypto.randomBytes(length));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const crypto = require("node:buffer") as typeof import("node:buffer");
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
