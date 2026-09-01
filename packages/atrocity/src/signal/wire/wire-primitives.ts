import { ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";

export function writeVarint(writer: ByteWriter, value: bigint | number): void {
  const n0 = typeof value === "bigint" ? value : BigInt(value);
  if (n0 < 0n) throw new ByteFormatError("Unsigned varint cannot be negative.");
  let n = n0;
  while (n >= 0x80n) {
    writer.writeByte(Number((n & 0x7fn) | 0x80n));
    n >>= 7n;
  }
  writer.writeByte(Number(n));
}

export function readVarint(reader: ByteReader): bigint {
  let value = 0n;
  let shift = 0n;
  for (let i = 0; i < 10; i += 1) {
    const byte = BigInt(reader.readByte());
    value |= (byte & 0x7fn) << shift;
    if ((byte & 0x80n) === 0n) return value;
    shift += 7n;
  }
  throw new ByteFormatError("Varint exceeds supported length.");
}

export function writeBytesField(
  writer: ByteWriter,
  fieldNumber: number,
  value: Uint8Array,
): void {
  writeVarint(writer, BigInt(fieldNumber * 8 + 2));
  writeVarint(writer, value.byteLength);
  writer.writeBytes(value);
}

export function writeUInt32Field(
  writer: ByteWriter,
  fieldNumber: number,
  value: number,
): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new ByteFormatError("Invalid uint32 field value.");
  }
  writeVarint(writer, BigInt(fieldNumber * 8));
  writeVarint(writer, value);
}

export function readTag(reader: ByteReader): {
  readonly fieldNumber: number;
  readonly wireType: number;
} {
  const tag = readVarint(reader);
  return {
    fieldNumber: Number(tag >> 3n),
    wireType: Number(tag & 7n),
  };
}

export function readBytes(
  reader: ByteReader,
  maxBytes: number,
): Uint8Array {
  const length = readVarint(reader);
  if (length > BigInt(maxBytes)) {
    throw new ByteFormatError("Length-delimited field exceeds configured limit.");
  }
  return reader.readBytes(Number(length)).slice();
}

export function readUInt32(reader: ByteReader): number {
  const value = readVarint(reader);
  if (value > 0xffffffffn) {
    throw new ByteFormatError("uint32 exceeds range.");
  }
  return Number(value);
}

export function skip(
  reader: ByteReader,
  wireType: number,
  maxBytes: number,
): void {
  if (wireType === 0) {
    void readVarint(reader);
    return;
  }
  if (wireType === 2) {
    void readBytes(reader, maxBytes);
    return;
  }
  throw new ByteFormatError(`Unsupported protobuf wire type ${wireType}.`);
}
