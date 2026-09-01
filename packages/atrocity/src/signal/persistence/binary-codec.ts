import { ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
import type {
  DoubleRatchetState,
  RootKeyState,
  ChainKeyState,
  RatchetKeyPair,
} from "../ratchet/index.js";
import type {
  PersistedSkippedMessageKey,
  SignalSessionRecord,
} from "./session-record.js";
import { SessionPersistenceError } from "./session-persistence-errors.js";

const MAGIC = new Uint8Array([0x41, 0x54, 0x52, 0x53]); // ATRS
const VERSION = 1;

export class SignalSessionBinaryCodec {
  encode(record: SignalSessionRecord): Uint8Array {
    validateRecord(record);

    const body = new ByteWriter();
    writeString(body, record.sessionId);
    writeUInt64(body, BigInt(record.createdAt));
    writeUInt64(body, BigInt(record.updatedAt));
    writeBytes(body, record.associatedData);
    writeRatchetState(body, record.ratchet);
    writeUInt32(body, record.skippedMessageKeys.length);

    for (const entry of record.skippedMessageKeys) {
      writeBytes(body, entry.ratchetPublicKey);
      writeUInt64(body, entry.messageNumber);
      writeBytes(body, entry.messageKey);
    }

    const payload = body.toUint8Array();
    const checksum = checksum32(payload);

    const output = new ByteWriter();
    output.writeBytes(MAGIC);
    output.writeByte(VERSION);
    writeUInt32(output, payload.byteLength);
    output.writeBytes(checksum);
    output.writeBytes(payload);
    return output.toUint8Array();
  }

  decode(input: Uint8Array): SignalSessionRecord {
    try {
      const reader = new ByteReader(input);
      const magic = reader.readBytes(4);
      if (!equalBytes(magic, MAGIC)) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_CORRUPT",
          "Session file magic does not match.",
        );
      }

      const version = reader.readByte();
      if (version !== VERSION) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_UNSUPPORTED_VERSION",
          `Unsupported session schema version ${version}.`,
        );
      }

      const payloadLength = readUInt32(reader);
      const expectedChecksum = reader.readBytes(32).slice();
      const payload = reader.readBytes(payloadLength).slice();

      if (!reader.eof) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_CORRUPT",
          "Trailing bytes after session record.",
        );
      }

      const actualChecksum = checksum32(payload);
      if (!equalBytes(expectedChecksum, actualChecksum)) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_INTEGRITY",
          "Session record checksum verification failed.",
        );
      }

      return decodePayload(payload);
    } catch (error) {
      if (error instanceof SessionPersistenceError) throw error;
      if (error instanceof ByteFormatError) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_CORRUPT",
          "Malformed session record.",
          { cause: error },
        );
      }
      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_CORRUPT",
        "Failed to decode session record.",
        { cause: error },
      );
    }
  }
}

function decodePayload(payload: Uint8Array): SignalSessionRecord {
  const reader = new ByteReader(payload);
  const sessionId = readString(reader);
  const createdAt = Number(readUInt64(reader));
  const updatedAt = Number(readUInt64(reader));
  const associatedData = readBytes(reader);
  const ratchet = readRatchetState(reader);

  const skippedCount = readUInt32(reader);
  if (skippedCount > 100_000) {
    throw new SessionPersistenceError(
      "SESSION_PERSISTENCE_INVALID",
      "Persisted skipped-key count exceeds safety limit.",
    );
  }

  const skippedMessageKeys: PersistedSkippedMessageKey[] = [];
  for (let i = 0; i < skippedCount; i += 1) {
    skippedMessageKeys.push(Object.freeze({
      ratchetPublicKey: readBytes(reader),
      messageNumber: readUInt64(reader),
      messageKey: readBytes(reader),
    }));
  }

  if (!reader.eof) {
    throw new SessionPersistenceError(
      "SESSION_PERSISTENCE_CORRUPT",
      "Unexpected trailing bytes in session payload.",
    );
  }

  const result: SignalSessionRecord = Object.freeze({
    schemaVersion: 1,
    sessionId,
    createdAt,
    updatedAt,
    associatedData,
    ratchet,
    skippedMessageKeys: Object.freeze(skippedMessageKeys),
  });

  validateRecord(result);
  return result;
}

function writeRatchetState(writer: ByteWriter, state: DoubleRatchetState): void {
  writeBytes(writer, state.rootKey.key);
  writeUInt32(writer, state.rootKey.generation);
  writeOptionalChain(writer, state.sendingChain);
  writeOptionalChain(writer, state.receivingChain);
  writeOptionalKeyPair(writer, state.sendRatchetKey);
  writeOptionalBytes(writer, state.remoteRatchetPublicKey);
  writeUInt64(writer, state.sendCount);
  writeUInt64(writer, state.receiveCount);
  writeUInt64(writer, state.previousSendingChainLength);
  writeUInt32(writer, state.skippedMessageKeyCount);
}

function readRatchetState(reader: ByteReader): DoubleRatchetState {
  const rootKey: RootKeyState = Object.freeze({
    key: readBytes(reader),
    generation: readUInt32(reader),
  });

  const sendingChain = readOptionalChain(reader);
  const receivingChain = readOptionalChain(reader);
  const sendRatchetKey = readOptionalKeyPair(reader);
  const remoteRatchetPublicKey = readOptionalBytes(reader);

  return Object.freeze({
    rootKey,
    ...(sendingChain ? { sendingChain } : {}),
    ...(receivingChain ? { receivingChain } : {}),
    ...(sendRatchetKey ? { sendRatchetKey } : {}),
    ...(remoteRatchetPublicKey ? { remoteRatchetPublicKey } : {}),
    sendCount: readUInt64(reader),
    receiveCount: readUInt64(reader),
    previousSendingChainLength: readUInt64(reader),
    skippedMessageKeyCount: readUInt32(reader),
  });
}

function writeOptionalChain(
  writer: ByteWriter,
  chain: ChainKeyState | undefined,
): void {
  writer.writeByte(chain ? 1 : 0);
  if (!chain) return;
  writeBytes(writer, chain.key);
  writeUInt64(writer, chain.index);
}

function readOptionalChain(
  reader: ByteReader,
): ChainKeyState | undefined {
  if (reader.readByte() === 0) return undefined;
  return Object.freeze({
    key: readBytes(reader),
    index: readUInt64(reader),
  });
}

function writeOptionalKeyPair(
  writer: ByteWriter,
  pair: RatchetKeyPair | undefined,
): void {
  writer.writeByte(pair ? 1 : 0);
  if (!pair) return;
  writeBytes(writer, pair.publicKey);
  writeBytes(writer, pair.privateKey);
}

function readOptionalKeyPair(
  reader: ByteReader,
): RatchetKeyPair | undefined {
  if (reader.readByte() === 0) return undefined;
  return Object.freeze({
    publicKey: readBytes(reader),
    privateKey: readBytes(reader),
  });
}

function writeOptionalBytes(
  writer: ByteWriter,
  value: Uint8Array | undefined,
): void {
  writer.writeByte(value ? 1 : 0);
  if (value) writeBytes(writer, value);
}

function readOptionalBytes(
  reader: ByteReader,
): Uint8Array | undefined {
  if (reader.readByte() === 0) return undefined;
  return readBytes(reader);
}

function writeString(writer: ByteWriter, value: string): void {
  writeBytes(writer, new TextEncoder().encode(value));
}

function readString(reader: ByteReader): string {
  return new TextDecoder().decode(readBytes(reader));
}

function writeBytes(writer: ByteWriter, value: Uint8Array): void {
  writeUInt32(writer, value.byteLength);
  writer.writeBytes(value);
}

function readBytes(reader: ByteReader): Uint8Array {
  const length = readUInt32(reader);
  if (length > 16 * 1024 * 1024) {
    throw new SessionPersistenceError(
      "SESSION_PERSISTENCE_TOO_LARGE",
      "Persisted byte field exceeds safety limit.",
    );
  }
  return reader.readBytes(length).slice();
}

function writeUInt32(writer: ByteWriter, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new ByteFormatError("Invalid uint32.");
  }
  writer.writeByte(value & 0xff);
  writer.writeByte((value >>> 8) & 0xff);
  writer.writeByte((value >>> 16) & 0xff);
  writer.writeByte((value >>> 24) & 0xff);
}

function readUInt32(reader: ByteReader): number {
  const b0 = reader.readByte();
  const b1 = reader.readByte();
  const b2 = reader.readByte();
  const b3 = reader.readByte();
  return (
    b0 |
    (b1 << 8) |
    (b2 << 16) |
    (b3 << 24)
  ) >>> 0;
}

function writeUInt64(writer: ByteWriter, value: bigint): void {
  if (value < 0n || value > 0xffffffffffffffffn) {
    throw new ByteFormatError("Invalid uint64.");
  }
  let n = value;
  for (let i = 0; i < 8; i += 1) {
    writer.writeByte(Number(n & 0xffn));
    n >>= 8n;
  }
}

function readUInt64(reader: ByteReader): bigint {
  let value = 0n;
  for (let i = 0; i < 8; i += 1) {
    value |= BigInt(reader.readByte()) << BigInt(i * 8);
  }
  return value;
}

function checksum32(value: Uint8Array): Uint8Array {
  // Persistence checksum only; this is not an authentication primitive.
  // The session store must still encrypt secrets at rest.
  const crypto = require("node:crypto") as typeof import("node:crypto");
  return new Uint8Array(crypto.createHash("sha256").update(value).digest());
}

function validateRecord(record: SignalSessionRecord): void {
  if (record.schemaVersion !== 1) {
    throw new SessionPersistenceError(
      "SESSION_PERSISTENCE_UNSUPPORTED_VERSION",
      "Unsupported session schema version.",
    );
  }
  if (!record.sessionId || record.sessionId.length > 256) {
    throw new SessionPersistenceError(
      "SESSION_PERSISTENCE_INVALID",
      "Session id is invalid.",
    );
  }
  if (!(record.associatedData instanceof Uint8Array)) {
    throw new SessionPersistenceError(
      "SESSION_PERSISTENCE_INVALID",
      "Associated data must be bytes.",
    );
  }
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let difference = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    difference |= a[i]! ^ b[i]!;
  }
  return difference === 0;
}
