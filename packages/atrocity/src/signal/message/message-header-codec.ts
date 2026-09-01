import { ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
import type { SignalMessageHeader } from "./message-types.js";
import { MessageCryptoError } from "./message-errors.js";

function writeVarint(writer: ByteWriter, value: bigint): void {
  if (value < 0n) throw new ByteFormatError("Unsigned varint cannot be negative.");
  let n = value;
  while (n >= 0x80n) {
    writer.writeByte(Number((n & 0x7fn) | 0x80n));
    n >>= 7n;
  }
  writer.writeByte(Number(n));
}

function readVarint(reader: ByteReader): bigint {
  let value = 0n;
  let shift = 0n;
  for (let i = 0; i < 10; i += 1) {
    const byte = BigInt(reader.readByte());
    value |= (byte & 0x7fn) << shift;
    if ((byte & 0x80n) === 0n) return value;
    shift += 7n;
  }
  throw new ByteFormatError("Message header varint is too long.");
}

/**
 * Stable internal binary format:
 *   uint8 version = 1
 *   uint8 dhLength = 32
 *   dh[32]
 *   varint pn
 *   varint n
 *
 * This is an Atrocity internal format, not a claim that it is WhatsApp's
 * exact wire encoding.
 */
export class SignalMessageHeaderCodec {
  private readonly version = 1;

  encode(header: SignalMessageHeader): Uint8Array {
    validateHeader(header);

    const writer = new ByteWriter();
    writer.writeByte(this.version);
    writer.writeByte(32);
    writer.writeBytes(header.ratchetPublicKey);
    writeVarint(writer, header.previousChainLength);
    writeVarint(writer, header.messageNumber);
    return writer.toUint8Array();
  }

  decode(input: Uint8Array): SignalMessageHeader {
    try {
      const reader = new ByteReader(input);
      const version = reader.readByte();
      const length = reader.readByte();

      if (version !== this.version || length !== 32) {
        throw new MessageCryptoError(
          "MESSAGE_INVALID_HEADER",
          "Unsupported Signal message header version or DH length.",
        );
      }

      const ratchetPublicKey = reader.readBytes(32).slice();
      const previousChainLength = readVarint(reader);
      const messageNumber = readVarint(reader);

      if (!reader.eof) {
        throw new MessageCryptoError(
          "MESSAGE_INVALID_HEADER",
          "Trailing bytes in Signal message header.",
        );
      }

      const header = Object.freeze({
        ratchetPublicKey,
        previousChainLength,
        messageNumber,
      });

      validateHeader(header);
      return header;
    } catch (error) {
      if (error instanceof MessageCryptoError) throw error;
      throw new MessageCryptoError(
        "MESSAGE_SERIALIZATION_FAILED",
        "Failed to decode Signal message header.",
        { cause: error },
      );
    }
  }
}

function validateHeader(header: SignalMessageHeader): void {
  if (
    !(header.ratchetPublicKey instanceof Uint8Array) ||
    header.ratchetPublicKey.byteLength !== 32
  ) {
    throw new MessageCryptoError(
      "MESSAGE_INVALID_HEADER",
      "Ratchet public key must be exactly 32 bytes.",
    );
  }

  if (header.previousChainLength < 0n || header.messageNumber < 0n) {
    throw new MessageCryptoError(
      "MESSAGE_INVALID_HEADER",
      "Message counters cannot be negative.",
    );
  }

  if (
    header.previousChainLength > 0xffffffffffffffffn ||
    header.messageNumber > 0xffffffffffffffffn
  ) {
    throw new MessageCryptoError(
      "MESSAGE_INVALID_HEADER",
      "Message counters exceed the supported range.",
    );
  }
}
