import { ByteFormatError } from "./byte-errors.js";

/**
 * Growable byte writer with explicit capacity checks.
 */
export class ByteWriter {
  private bytes: Uint8Array;
  private offsetValue = 0;

  constructor(initialCapacity = 64) {
    if (!Number.isSafeInteger(initialCapacity) || initialCapacity < 0) {
      throw new ByteFormatError(`Invalid initial capacity: ${String(initialCapacity)}.`);
    }
    this.bytes = new Uint8Array(initialCapacity);
  }

  get offset(): number {
    return this.offsetValue;
  }

  writeByte(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new ByteFormatError(`Invalid byte value: ${String(value)}.`);
    }

    this.ensureCapacity(1);
    this.bytes[this.offsetValue++] = value;
  }

  writeBytes(value: Uint8Array): void {
    if (!(value instanceof Uint8Array)) {
      throw new ByteFormatError("ByteWriter input must be a Uint8Array.");
    }

    this.ensureCapacity(value.byteLength);
    this.bytes.set(value, this.offsetValue);
    this.offsetValue += value.byteLength;
  }

  writeUint16BE(value: number): void {
    this.writeUint(value, 2, false);
  }

  writeUint32BE(value: number): void {
    this.writeUint(value, 4, false);
  }

  writeUint16LE(value: number): void {
    this.writeUint(value, 2, true);
  }

  writeUint32LE(value: number): void {
    this.writeUint(value, 4, true);
  }

  writeUtf8(value: string): void {
    if (typeof value !== "string") {
      throw new ByteFormatError("UTF-8 input must be a string.");
    }
    this.writeBytes(new TextEncoder().encode(value));
  }

  toUint8Array(): Uint8Array {
    return this.bytes.slice(0, this.offsetValue);
  }

  private writeUint(value: number, size: 2 | 4, littleEndian: boolean): void {
    const max = size === 2 ? 0xffff : 0xffffffff;
    if (!Number.isSafeInteger(value) || value < 0 || value > max) {
      throw new ByteFormatError(`Value does not fit in uint${size * 8}: ${String(value)}.`);
    }

    this.ensureCapacity(size);
    const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offsetValue, size);
    if (size === 2) {
      view.setUint16(0, value, littleEndian);
    } else {
      view.setUint32(0, value, littleEndian);
    }
    this.offsetValue += size;
  }

  private ensureCapacity(additionalBytes: number): void {
    const required = this.offsetValue + additionalBytes;
    if (required <= this.bytes.byteLength) {
      return;
    }

    let nextCapacity = Math.max(1, this.bytes.byteLength);
    while (nextCapacity < required) {
      nextCapacity = Math.max(nextCapacity * 2, required);
    }

    const next = new Uint8Array(nextCapacity);
    next.set(this.bytes);
    this.bytes = next;
  }
}
