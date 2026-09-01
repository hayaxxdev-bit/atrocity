import { ByteBoundsError, ByteFormatError } from "./byte-errors.js";

/**
 * Bounds-checked cursor over an immutable byte view.
 *
 * The reader never grows the input and never allocates based on a
 * network-controlled length without an explicit caller limit.
 */
export class ByteReader {
  private readonly bytes: Uint8Array;
  private offsetValue = 0;

  constructor(input: Uint8Array) {
    if (!(input instanceof Uint8Array)) {
      throw new ByteFormatError("ByteReader input must be a Uint8Array.");
    }
    this.bytes = input;
  }

  get offset(): number {
    return this.offsetValue;
  }

  get remaining(): number {
    return this.bytes.byteLength - this.offsetValue;
  }

  get eof(): boolean {
    return this.remaining === 0;
  }

  peekByte(): number {
    this.requireAvailable(1);
    return this.bytes[this.offsetValue]!;
  }

  readByte(): number {
    this.requireAvailable(1);
    return this.bytes[this.offsetValue++]!;
  }

  readBytes(length: number): Uint8Array {
    this.validateLength(length);
    this.requireAvailable(length);

    const start = this.offsetValue;
    this.offsetValue += length;
    return this.bytes.subarray(start, this.offsetValue);
  }

  readUint16BE(): number {
    this.requireAvailable(2);
    const value = (this.bytes[this.offsetValue]! << 8) | this.bytes[this.offsetValue + 1]!;
    this.offsetValue += 2;
    return value >>> 0;
  }

  readUint32BE(): number {
    this.requireAvailable(4);
    const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offsetValue, 4);
    const value = view.getUint32(0, false);
    this.offsetValue += 4;
    return value;
  }

  readUint16LE(): number {
    this.requireAvailable(2);
    const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offsetValue, 2);
    const value = view.getUint16(0, true);
    this.offsetValue += 2;
    return value;
  }

  readUint32LE(): number {
    this.requireAvailable(4);
    const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offsetValue, 4);
    const value = view.getUint32(0, true);
    this.offsetValue += 4;
    return value;
  }

  readUtf8(length: number): string {
    return new TextDecoder().decode(this.readBytes(length));
  }

  skip(length: number): void {
    this.validateLength(length);
    this.requireAvailable(length);
    this.offsetValue += length;
  }

  requireAvailable(length: number): void {
    this.validateLength(length);
    if (length > this.remaining) {
      throw new ByteBoundsError(
        `Requested ${length} byte(s) at offset ${this.offsetValue}, ` +
        `but only ${this.remaining} remain.`,
      );
    }
  }

  private validateLength(length: number): void {
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new ByteFormatError(`Invalid byte length: ${String(length)}.`);
    }
  }
}
