import { ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
import { protocolNode, type ProtocolNode } from "../node/index.js";
import type { ProtocolContent } from "../node/protocol-content.js";
import { WABINARY_TAGS, type WABinaryProfile } from "./wabinary-profile.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type WABinaryCodecLimits = {
  readonly maxDepth: number;
  readonly maxAttributes: number;
  readonly maxChildren: number;
  readonly maxStringBytes: number;
  readonly maxBinaryBytes: number;
};

export const DEFAULT_WABINARY_LIMITS: WABinaryCodecLimits = Object.freeze({
  maxDepth: 64,
  maxAttributes: 256,
  maxChildren: 4096,
  maxStringBytes: 1 << 20,
  maxBinaryBytes: 16 << 20,
});

export type WABinaryTokenResolver = {
  readonly singleByteTokens: readonly (string | undefined)[];
  readonly tokenMap: ReadonlyMap<string, number>;
};

export type WABinaryCodecConfig = {
  readonly profile: WABinaryProfile;
  readonly limits?: WABinaryCodecLimits;
};

function validateLimits(limits: WABinaryCodecLimits): void {
  for (const value of Object.values(limits)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError("WABinary limits must be non-negative safe integers.");
    }
  }
}

function writeUInt20(writer: ByteWriter, value: number): void {
  writer.writeByte((value >>> 16) & 0x0f);
  writer.writeByte((value >>> 8) & 0xff);
  writer.writeByte(value & 0xff);
}

function readUInt20(reader: ByteReader): number {
  return ((reader.readByte() & 0x0f) << 16) |
    (reader.readByte() << 8) |
    reader.readByte();
}

function writeBinaryLength(writer: ByteWriter, length: number): void {
  if (length >= 2 ** 32 || length < 0 || !Number.isSafeInteger(length)) {
    throw new ByteFormatError("WABinary length is outside uint32 range.");
  }

  if (length >= 1 << 20) {
    writer.writeByte(WABINARY_TAGS.BINARY_32);
    writer.writeUint32BE(length);
  } else if (length >= 256) {
    writer.writeByte(WABINARY_TAGS.BINARY_20);
    writeUInt20(writer, length);
  } else {
    writer.writeByte(WABINARY_TAGS.BINARY_8);
    writer.writeByte(length);
  }
}

function readBinaryLength(reader: ByteReader, marker: number): number {
  switch (marker) {
    case WABINARY_TAGS.BINARY_8:
      return reader.readByte();
    case WABINARY_TAGS.BINARY_20:
      return readUInt20(reader);
    case WABINARY_TAGS.BINARY_32:
      return reader.readUint32BE();
    default:
      throw new ByteFormatError(`Invalid binary length marker ${marker}.`);
  }
}

function writeListStart(writer: ByteWriter, size: number): void {
  if (size < 0 || size > 0xffff || !Number.isSafeInteger(size)) {
    throw new ByteFormatError(`Invalid list size ${String(size)}.`);
  }

  if (size === 0) {
    writer.writeByte(WABINARY_TAGS.LIST_EMPTY);
  } else if (size < 256) {
    writer.writeByte(WABINARY_TAGS.LIST_8);
    writer.writeByte(size);
  } else {
    writer.writeByte(WABINARY_TAGS.LIST_16);
    writer.writeUint16BE(size);
  }
}

function readListStart(reader: ByteReader): number {
  const marker = reader.readByte();
  switch (marker) {
    case WABINARY_TAGS.LIST_EMPTY:
      return 0;
    case WABINARY_TAGS.LIST_8:
      return reader.readByte();
    case WABINARY_TAGS.LIST_16:
      return reader.readUint16BE();
    default:
      throw new ByteFormatError(`Invalid list marker ${marker}.`);
  }
}

function isNibble(value: string, max: number): boolean {
  if (!value || value.length > max) return false;
  return [...value].every((ch) => (ch >= "0" && ch <= "9") || ch === "-" || ch === ".");
}

function isHex(value: string, max: number): boolean {
  if (!value || value.length > max) return false;
  return [...value].every((ch) =>
    (ch >= "0" && ch <= "9") || (ch >= "A" && ch <= "F")
  );
}

function encodeNibble(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch === "-") return 10;
  if (ch === ".") return 11;
  if (ch === "\0") return 15;
  throw new ByteFormatError(`Invalid nibble character ${JSON.stringify(ch)}.`);
}

function encodeHex(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "F") return ch.charCodeAt(0) - 55;
  if (ch === "\0") return 15;
  throw new ByteFormatError(`Invalid hex character ${JSON.stringify(ch)}.`);
}

function decodeNibble(n: number): string {
  if (n <= 9) return String.fromCharCode(48 + n);
  if (n === 10) return "-";
  if (n === 11) return ".";
  if (n === 15) return "\0";
  throw new ByteFormatError(`Invalid nibble value ${n}.`);
}

function decodeHex(n: number): string {
  if (n < 10) return String.fromCharCode(48 + n);
  if (n < 16) return String.fromCharCode(65 + n - 10);
  throw new ByteFormatError(`Invalid hex value ${n}.`);
}

function writePacked(writer: ByteWriter, value: string, hex: boolean, max: number): void {
  if (value.length > max) throw new ByteFormatError("Packed string exceeds configured limit.");
  writer.writeByte(hex ? WABINARY_TAGS.HEX_8 : WABINARY_TAGS.NIBBLE_8);

  const odd = value.length % 2 === 1;
  writer.writeByte(Math.ceil(value.length / 2) | (odd ? 0x80 : 0));

  const packer = hex ? encodeHex : encodeNibble;
  for (let i = 0; i < value.length; i += 2) {
    writer.writeByte((packer(value[i]!) << 4) | packer(value[i + 1] ?? "\0"));
  }
}

function readPacked(reader: ByteReader, marker: number): string {
  const header = reader.readByte();
  const count = header & 0x7f;
  let result = "";

  for (let i = 0; i < count; i++) {
    const byte = reader.readByte();
    result += marker === WABINARY_TAGS.NIBBLE_8
      ? decodeNibble((byte >>> 4) & 0x0f)
      : decodeHex((byte >>> 4) & 0x0f);
    result += marker === WABINARY_TAGS.NIBBLE_8
      ? decodeNibble(byte & 0x0f)
      : decodeHex(byte & 0x0f);
  }

  return (header & 0x80) !== 0 ? result.slice(0, -1) : result;
}

function writeString(
  writer: ByteWriter,
  value: string,
  profile: WABinaryProfile,
  maxStringBytes: number,
): void {
  const token = profile.tokenMap.get(value);
  if (token !== undefined) {
    if (token < 1 || token > 255) throw new ByteFormatError("Token index out of range.");
    writer.writeByte(token);
    return;
  }

  const maxPacked = profile.maxPackedLength ?? WABINARY_TAGS.PACKED_MAX;

  if (isNibble(value, maxPacked)) {
    writePacked(writer, value, false, maxPacked);
    return;
  }

  if (isHex(value, maxPacked)) {
    writePacked(writer, value, true, maxPacked);
    return;
  }

  const bytes = encoder.encode(value);
  if (bytes.byteLength > maxStringBytes) {
    throw new ByteFormatError("String exceeds configured limit.");
  }
  writeBinaryLength(writer, bytes.byteLength);
  writer.writeBytes(bytes);
}

function readString(
  reader: ByteReader,
  profile: WABinaryProfile,
  maxStringBytes: number,
): string {
  const marker = reader.readByte();

  if (marker >= 1 && marker < profile.singleByteTokens.length) {
    return profile.singleByteTokens[marker] ?? "";
  }

  if (
    marker === WABINARY_TAGS.DICTIONARY_0 ||
    marker === WABINARY_TAGS.DICTIONARY_1 ||
    marker === WABINARY_TAGS.DICTIONARY_2 ||
    marker === WABINARY_TAGS.DICTIONARY_3
  ) {
    throw new ByteFormatError("Double-byte token dictionaries are not enabled in this initial profile.");
  }

  if (marker === WABINARY_TAGS.LIST_EMPTY) return "";

  if (
    marker === WABINARY_TAGS.BINARY_8 ||
    marker === WABINARY_TAGS.BINARY_20 ||
    marker === WABINARY_TAGS.BINARY_32
  ) {
    const length = readBinaryLength(reader, marker);
    if (length > maxStringBytes) {
      throw new ByteFormatError("Decoded string exceeds configured limit.");
    }
    return decoder.decode(reader.readBytes(length));
  }

  if (marker === WABINARY_TAGS.NIBBLE_8 || marker === WABINARY_TAGS.HEX_8) {
    return readPacked(reader, marker);
  }

  throw new ByteFormatError(`Invalid string marker ${marker}.`);
}

export class WABinaryCodec {
  private readonly limits: WABinaryCodecLimits;

  constructor(private readonly config: WABinaryCodecConfig) {
    this.limits = Object.freeze({
      ...DEFAULT_WABINARY_LIMITS,
      ...(config.limits ?? {}),
    });
    validateLimits(this.limits);
  }

  encode(node: ProtocolNode): Uint8Array {
    const writer = new ByteWriter();
    this.encodeNode(writer, node, 0);
    return writer.toUint8Array();
  }

  decode(input: Uint8Array): ProtocolNode {
    const reader = new ByteReader(input);
    const node = this.decodeNode(reader, 0);

    if (!reader.eof) {
      throw new ByteFormatError(`Trailing bytes at offset ${reader.offset}.`);
    }

    return node;
  }

  private encodeNode(writer: ByteWriter, node: ProtocolNode, depth: number): void {
    if (depth > this.limits.maxDepth) {
      throw new ByteFormatError("Maximum WABinary node depth exceeded.");
    }

    const attributeEntries = Object.entries(node.attrs);
    if (attributeEntries.length > this.limits.maxAttributes) {
      throw new ByteFormatError("Maximum WABinary attribute count exceeded.");
    }

    const content = node.content;
    const contentPresent = content !== undefined;
    const listSize = 1 + attributeEntries.length * 2 + (contentPresent ? 1 : 0);

    writeListStart(writer, listSize);
    writeString(writer, node.tag, this.config.profile, this.limits.maxStringBytes);

    for (const [key, value] of attributeEntries) {
      if (typeof value !== "string") {
        throw new ByteFormatError(`Attribute ${key} is not a string.`);
      }
      writeString(writer, key, this.config.profile, this.limits.maxStringBytes);
      writeString(writer, value, this.config.profile, this.limits.maxStringBytes);
    }

    if (content === undefined) return;

    if (content.kind === "text") {
      writeString(writer, content.value, this.config.profile, this.limits.maxStringBytes);
      return;
    }

    if (content.kind === "binary") {
      if (content.value.byteLength > this.limits.maxBinaryBytes) {
        throw new ByteFormatError("Maximum WABinary binary content exceeded.");
      }
      writeBinaryLength(writer, content.value.byteLength);
      writer.writeBytes(content.value);
      return;
    }

    if (content.value.length > this.limits.maxChildren) {
      throw new ByteFormatError("Maximum WABinary child count exceeded.");
    }

    writeListStart(writer, content.value.length);
    for (const child of content.value) {
      this.encodeNode(writer, child, depth + 1);
    }
  }

  private decodeNode(reader: ByteReader, depth: number): ProtocolNode {
    if (depth > this.limits.maxDepth) {
      throw new ByteFormatError("Maximum WABinary node depth exceeded.");
    }

    const listSize = readListStart(reader);
    if (listSize < 1) throw new ByteFormatError("Invalid WABinary node list size.");

    const tag = readString(reader, this.config.profile, this.limits.maxStringBytes);
    const attributeCount = (listSize - 1) >>> 1;
    const hasContent = (listSize & 1) === 0;

    if (attributeCount > this.limits.maxAttributes) {
      throw new ByteFormatError("Maximum WABinary attribute count exceeded.");
    }

    const attrs: Record<string, string> = {};
    for (let i = 0; i < attributeCount; i++) {
      const key = readString(reader, this.config.profile, this.limits.maxStringBytes);
      const value = readString(reader, this.config.profile, this.limits.maxStringBytes);
      attrs[key] = value;
    }

    let content: ProtocolContent | undefined;

    if (hasContent) {
      const marker = reader.peekByte();

      if (
        marker === WABINARY_TAGS.LIST_EMPTY ||
        marker === WABINARY_TAGS.LIST_8 ||
        marker === WABINARY_TAGS.LIST_16
      ) {
        const childCount = readListStart(reader);
        if (childCount > this.limits.maxChildren) {
          throw new ByteFormatError("Maximum WABinary child count exceeded.");
        }

        const children: ProtocolNode[] = [];
        for (let i = 0; i < childCount; i++) {
          children.push(this.decodeNode(reader, depth + 1));
        }
        content = Object.freeze({
          kind: "nodes",
          value: Object.freeze(children),
        });
      } else if (
        marker === WABINARY_TAGS.BINARY_8 ||
        marker === WABINARY_TAGS.BINARY_20 ||
        marker === WABINARY_TAGS.BINARY_32
      ) {
        const length = readBinaryLength(reader, marker);
        if (length > this.limits.maxBinaryBytes) {
          throw new ByteFormatError("Maximum WABinary binary content exceeded.");
        }
        content = Object.freeze({
          kind: "binary",
          value: reader.readBytes(length).slice(),
        });
      } else {
        content = Object.freeze({
          kind: "text",
          value: readString(reader, this.config.profile, this.limits.maxStringBytes),
        });
      }
    }

    return protocolNode(tag, attrs, content);
  }
}
