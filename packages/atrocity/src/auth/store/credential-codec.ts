import { ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
import type {
  AuthenticationCredentials,
  DeviceIdentity,
  IdentitySigningKey,
  SignedPreKey,
} from "../credentials/credential-types.js";
import { SessionPersistenceError } from "../../signal/persistence/session-persistence-errors.js";
import { CREDENTIAL_RECORD_VERSION, type CredentialRecord } from "./credential-record.js";

const MAGIC = new Uint8Array([0x41, 0x54, 0x52, 0x43]); // ATRC

export class CredentialBinaryCodec {
  encode(record: CredentialRecord): Uint8Array {
    validate(record);

    const body = new ByteWriter();
    writeUInt64(body, BigInt(record.updatedAt));
    writeDevice(body, record.credentials.device);
    writeSigningKey(body, record.credentials.identitySigningKey);
    writeSignedPreKey(body, record.credentials.signedPreKey);
    writeUInt32(body, record.credentials.registrationId);
    writeOptionalBytes(body, record.credentials.advSecretKey);
    writeOptionalKeyPair(body, record.credentials.noiseStatic);

    const payload = body.toUint8Array();
    const checksum = checksum32(payload);

    const output = new ByteWriter();
    output.writeBytes(MAGIC);
    output.writeByte(CREDENTIAL_RECORD_VERSION);
    writeUInt32(output, payload.byteLength);
    output.writeBytes(checksum);
    output.writeBytes(payload);
    return output.toUint8Array();
  }

  decode(input: Uint8Array): CredentialRecord {
    try {
      const reader = new ByteReader(input);
      if (!equalBytes(reader.readBytes(4), MAGIC)) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_CORRUPT",
          "Credential record magic mismatch.",
        );
      }

      const version = reader.readByte();
      if (version !== CREDENTIAL_RECORD_VERSION) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_UNSUPPORTED_VERSION",
          `Unsupported credential record version ${version}.`,
        );
      }

      const payloadLength = readUInt32(reader);
      const expected = reader.readBytes(32).slice();
      const payload = reader.readBytes(payloadLength).slice();

      if (!reader.eof) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_CORRUPT",
          "Trailing credential record bytes.",
        );
      }

      if (!equalBytes(expected, checksum32(payload))) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_INTEGRITY",
          "Credential record checksum failed.",
        );
      }

      const body = new ByteReader(payload);
      const credentials: AuthenticationCredentials = Object.freeze({
        device: readDevice(body),
        identitySigningKey: readSigningKey(body),
        signedPreKey: readSignedPreKey(body),
        registrationId: readUInt32(body),
        advSecretKey: readOptionalBytes(body),
        noiseStatic: readOptionalKeyPair(body),
      });

      if (!body.eof) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_CORRUPT",
          "Trailing credential payload bytes.",
        );
      }

      const record = Object.freeze({
        schemaVersion: CREDENTIAL_RECORD_VERSION,
        credentials,
        updatedAt: Number(readTimestampGuarded(credentials, payload)),
      });

      // Decode timestamp a second time from its source is intentionally
      // avoided; the record constructor below receives the parsed value.
      const reparsed = new ByteReader(payload);
      const updatedAt = Number(readUInt64(reparsed));
      return Object.freeze({
        schemaVersion: CREDENTIAL_RECORD_VERSION,
        credentials,
        updatedAt,
      });
    } catch (error) {
      if (error instanceof SessionPersistenceError) throw error;
      if (error instanceof ByteFormatError) {
        throw new SessionPersistenceError(
          "SESSION_PERSISTENCE_CORRUPT",
          "Malformed credential record.",
          { cause: error },
        );
      }
      throw new SessionPersistenceError(
        "SESSION_PERSISTENCE_CORRUPT",
        "Failed to decode credential record.",
        { cause: error },
      );
    }
  }
}

function writeDevice(writer: ByteWriter, value: DeviceIdentity): void {
  writeBytes(writer, value.deviceId);
  writeUInt32(writer, value.registrationId);
  writeBytes(writer, value.identityKeyPublic);
  writeBytes(writer, value.identityKeyPrivate);
}

function readDevice(reader: ByteReader): DeviceIdentity {
  return Object.freeze({
    deviceId: readBytes(reader),
    registrationId: readUInt32(reader),
    identityKeyPublic: readBytes(reader),
    identityKeyPrivate: readBytes(reader),
  });
}

function writeSigningKey(
  writer: ByteWriter,
  value: IdentitySigningKey,
): void {
  writeBytes(writer, value.publicKey);
  writeBytes(writer, value.privateKey);
}

function readSigningKey(reader: ByteReader): IdentitySigningKey {
  return Object.freeze({
    publicKey: readBytes(reader),
    privateKey: readBytes(reader),
  });
}

function writeSignedPreKey(
  writer: ByteWriter,
  value: SignedPreKey,
): void {
  writeUInt32(writer, value.keyId);
  writeBytes(writer, value.publicKey);
  writeBytes(writer, value.privateKey);
  writeBytes(writer, value.signature);
  writeUInt64(writer, BigInt(value.generatedAt));
}

function readSignedPreKey(reader: ByteReader): SignedPreKey {
  return Object.freeze({
    keyId: readUInt32(reader),
    publicKey: readBytes(reader),
    privateKey: readBytes(reader),
    signature: readBytes(reader),
    generatedAt: Number(readUInt64(reader)),
  });
}

function writeOptionalBytes(
  writer: ByteWriter,
  value: Uint8Array | undefined,
): void {
  writer.writeByte(value ? 1 : 0);
  if (value) writeBytes(writer, value);
}

function readOptionalBytes(reader: ByteReader): Uint8Array | undefined {
  return reader.readByte() === 0 ? undefined : readBytes(reader);
}

function writeOptionalKeyPair(
  writer: ByteWriter,
  value: AuthenticationCredentials["noiseStatic"],
): void {
  writer.writeByte(value ? 1 : 0);
  if (!value) return;
  writeBytes(writer, value.publicKey);
  writeBytes(writer, value.privateKey);
}

function readOptionalKeyPair(
  reader: ByteReader,
): AuthenticationCredentials["noiseStatic"] {
  if (reader.readByte() === 0) return undefined;
  return Object.freeze({
    publicKey: readBytes(reader),
    privateKey: readBytes(reader),
  });
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
      "Credential byte field exceeds safety limit.",
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
  const crypto = require("node:crypto") as typeof import("node:crypto");
  return new Uint8Array(
    crypto.createHash("sha256").update(value).digest(),
  );
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

function validate(record: CredentialRecord): void {
  if (record.schemaVersion !== CREDENTIAL_RECORD_VERSION) {
    throw new SessionPersistenceError(
      "SESSION_PERSISTENCE_UNSUPPORTED_VERSION",
      "Unsupported credential schema version.",
    );
  }
  if (!Number.isSafeInteger(record.updatedAt) || record.updatedAt < 0) {
    throw new SessionPersistenceError(
      "SESSION_PERSISTENCE_INVALID",
      "Credential record timestamp is invalid.",
    );
  }
}

function readTimestampGuarded(
  _credentials: AuthenticationCredentials,
  _payload: Uint8Array,
): bigint {
  return 0n;
}
