import { ByteBoundsError, ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";

export function writeVarint(writer: ByteWriter, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new ByteFormatError("Invalid protobuf varint.");
  let n = value;
  while (n >= 0x80) {
    writer.writeByte((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  writer.writeByte(n);
}

export function readVarint(reader: ByteReader): number {
  let result = 0;
  let multiplier = 1;
  for (let i = 0; i < 10; i += 1) {
    const b = reader.readByte();
    result += (b & 0x7f) * multiplier;
    if ((b & 0x80) === 0) {
      if (!Number.isSafeInteger(result)) throw new ByteFormatError("Protobuf varint exceeds safe integer range.");
      return result;
    }
    multiplier *= 128;
  }
  throw new ByteFormatError("Protobuf varint is too long.");
}

export function writeBytesField(writer: ByteWriter, fieldNumber: number, value: Uint8Array): void {
  if (!Number.isSafeInteger(fieldNumber) || fieldNumber <= 0 || fieldNumber > 0x1fffffff) {
    throw new ByteFormatError(`Invalid protobuf field number: ${fieldNumber}.`);
  }
  writeVarint(writer, fieldNumber * 8 + 2);
  writeVarint(writer, value.byteLength);
  writer.writeBytes(value);
}

export function readTag(reader: ByteReader): { readonly fieldNumber: number; readonly wireType: number } {
  const tag = readVarint(reader);
  const wireType = tag & 7;
  const fieldNumber = Math.floor(tag / 8);
  if (fieldNumber <= 0) throw new ByteFormatError("Invalid protobuf field number.");
  return { fieldNumber, wireType };
}

export function readBytesField(reader: ByteReader, maxBytes: number): Uint8Array {
  const length = readVarint(reader);
  if (length > maxBytes) throw new ByteFormatError("Protobuf field exceeds configured limit.");
  try {
    return reader.readBytes(length).slice();
  } catch (error) {
    if (error instanceof ByteBoundsError) throw error;
    throw new ByteFormatError("Invalid protobuf length-delimited field.", { cause: error });
  }
}

export function skipField(reader: ByteReader, wireType: number, maxBytes: number): void {
  if (wireType === 0) { readVarint(reader); return; }
  if (wireType === 2) { void readBytesField(reader, maxBytes); return; }
  throw new ByteFormatError(`Unsupported protobuf wire type ${wireType}.`);
}
