import { ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
import type {
  ClientPayload,
  DevicePairingData,
  UserAgent,
  WebInfo,
} from "./client-payload-types.js";
import { ClientPayloadError } from "./client-payload-errors.js";
import {
  readBool,
  readBytes,
  readString,
  readTag,
  readUInt32,
  skip,
  writeBoolField,
  writeBytesField,
  writeStringField,
  writeTag,
  writeUInt32Field,
  writeVarint,
} from "./proto-primitives.js";

export type ClientPayloadCodecLimits = {
  readonly maxMessageBytes: number;
  readonly maxFieldBytes: number;
  readonly maxShards: number;
};

export const DEFAULT_CLIENT_PAYLOAD_LIMITS: ClientPayloadCodecLimits = Object.freeze({
  maxMessageBytes: 16 * 1024 * 1024,
  maxFieldBytes: 4 * 1024 * 1024,
  maxShards: 256,
});

/**
 * Current-reference ClientPayload adapter.
 *
 * Field numbers are taken from the currently published/reference
 * ClientPayload schema. Unknown fields are ignored to preserve forward
 * compatibility.
 */
export class ClientPayloadCodec {
  constructor(
    private readonly limits: ClientPayloadCodecLimits = DEFAULT_CLIENT_PAYLOAD_LIMITS,
  ) {}

  encode(payload: ClientPayload): Uint8Array {
    const writer = new ByteWriter();

    if (payload.username !== undefined) {
      writeTag(writer, 1, 0);
      writeVarint(writer, payload.username);
    }
    if (payload.passive !== undefined) writeBoolField(writer, 3, payload.passive);
    if (payload.userAgent !== undefined) {
      writeBytesField(writer, 5, encodeUserAgent(payload.userAgent));
    }
    if (payload.webInfo !== undefined) {
      writeBytesField(writer, 6, encodeWebInfo(payload.webInfo));
    }
    if (payload.pushName !== undefined) writeStringField(writer, 7, payload.pushName);
    if (payload.sessionId !== undefined) writeUInt32Field(writer, 9, payload.sessionId);
    if (payload.shortConnect !== undefined) writeBoolField(writer, 10, payload.shortConnect);
    if (payload.connectType !== undefined) writeUInt32Field(writer, 12, payload.connectType);
    if (payload.connectReason !== undefined) writeUInt32Field(writer, 13, payload.connectReason);

    if (payload.shards !== undefined) {
      if (payload.shards.length > this.limits.maxShards) {
        throw new ClientPayloadError(
          "CLIENT_PAYLOAD_TOO_LARGE",
          "Too many ClientPayload shards.",
        );
      }
      for (const shard of payload.shards) writeUInt32Field(writer, 14, shard);
    }

    if (payload.dnsSource !== undefined) writeUInt32Field(writer, 15, payload.dnsSource);
    if (payload.connectAttemptCount !== undefined) {
      writeUInt32Field(writer, 16, payload.connectAttemptCount);
    }
    if (payload.device !== undefined) writeUInt32Field(writer, 18, payload.device);
    if (payload.devicePairingData !== undefined) {
      writeBytesField(writer, 19, encodeDevicePairingData(payload.devicePairingData));
    }
    if (payload.product !== undefined) writeUInt32Field(writer, 20, payload.product);
    if (payload.fbCat !== undefined) writeBytesField(writer, 21, payload.fbCat);
    if (payload.fbUserAgent !== undefined) {
      writeBytesField(writer, 22, payload.fbUserAgent);
    }
    if (payload.oc !== undefined) writeBoolField(writer, 23, payload.oc);
    if (payload.lc !== undefined) writeUInt32Field(writer, 24, payload.lc);
    if (payload.lidDbMigrated !== undefined) {
      writeBoolField(writer, 25, payload.lidDbMigrated);
    }
    if (payload.pull !== undefined) writeBoolField(writer, 26, payload.pull);

    const result = writer.toUint8Array();
    if (result.byteLength > this.limits.maxMessageBytes) {
      throw new ClientPayloadError(
        "CLIENT_PAYLOAD_TOO_LARGE",
        "Encoded ClientPayload exceeds configured limit.",
      );
    }
    return result;
  }

  decode(input: Uint8Array): ClientPayload {
    if (input.byteLength > this.limits.maxMessageBytes) {
      throw new ClientPayloadError(
        "CLIENT_PAYLOAD_TOO_LARGE",
        "ClientPayload exceeds configured limit.",
      );
    }

    const reader = new ByteReader(input);
    const output: {
      username?: bigint;
      passive?: boolean;
      userAgent?: UserAgent;
      webInfo?: WebInfo;
      pushName?: string;
      sessionId?: number;
      shortConnect?: boolean;
      connectType?: number;
      connectReason?: number;
      shards?: number[];
      dnsSource?: number;
      connectAttemptCount?: number;
      device?: number;
      devicePairingData?: DevicePairingData;
      product?: number;
      fbCat?: Uint8Array;
      fbUserAgent?: Uint8Array;
      oc?: boolean;
      lc?: number;
      lidDbMigrated?: boolean;
      pull?: boolean;
    } = {};

    while (!reader.eof) {
      const { fieldNumber, wireType } = readTag(reader);

      switch (fieldNumber) {
        case 1:
          requireWire(wireType, 0);
          output.username = readVarint(reader);
          break;
        case 3:
          requireWire(wireType, 0);
          output.passive = readBool(reader);
          break;
        case 5:
          requireWire(wireType, 2);
          output.userAgent = decodeUserAgent(readBytes(reader, this.limits.maxFieldBytes), this.limits);
          break;
        case 6:
          requireWire(wireType, 2);
          output.webInfo = decodeWebInfo(readBytes(reader, this.limits.maxFieldBytes), this.limits);
          break;
        case 7:
          requireWire(wireType, 2);
          output.pushName = readString(reader, this.limits.maxFieldBytes);
          break;
        case 9:
          requireWire(wireType, 0);
          output.sessionId = readUInt32(reader);
          break;
        case 10:
          requireWire(wireType, 0);
          output.shortConnect = readBool(reader);
          break;
        case 12:
          requireWire(wireType, 0);
          output.connectType = readUInt32(reader);
          break;
        case 13:
          requireWire(wireType, 0);
          output.connectReason = readUInt32(reader);
          break;
        case 14:
          requireWire(wireType, 0);
          output.shards ??= [];
          if (output.shards.length >= this.limits.maxShards) {
            throw new ClientPayloadError(
              "CLIENT_PAYLOAD_TOO_LARGE",
              "Decoded ClientPayload shard count exceeds configured limit.",
            );
          }
          output.shards.push(readUInt32(reader));
          break;
        case 15:
          requireWire(wireType, 0);
          output.dnsSource = readUInt32(reader);
          break;
        case 16:
          requireWire(wireType, 0);
          output.connectAttemptCount = readUInt32(reader);
          break;
        case 18:
          requireWire(wireType, 0);
          output.device = readUInt32(reader);
          break;
        case 19:
          requireWire(wireType, 2);
          output.devicePairingData = decodeDevicePairingData(
            readBytes(reader, this.limits.maxFieldBytes),
            this.limits,
          );
          break;
        case 20:
          requireWire(wireType, 0);
          output.product = readUInt32(reader);
          break;
        case 21:
          requireWire(wireType, 2);
          output.fbCat = readBytes(reader, this.limits.maxFieldBytes);
          break;
        case 22:
          requireWire(wireType, 2);
          output.fbUserAgent = readBytes(reader, this.limits.maxFieldBytes);
          break;
        case 23:
          requireWire(wireType, 0);
          output.oc = readBool(reader);
          break;
        case 24:
          requireWire(wireType, 0);
          output.lc = readUInt32(reader);
          break;
        case 25:
          requireWire(wireType, 0);
          output.lidDbMigrated = readBool(reader);
          break;
        case 26:
          requireWire(wireType, 0);
          output.pull = readBool(reader);
          break;
        default:
          skip(reader, wireType, this.limits.maxFieldBytes);
          break;
      }
    }

    return Object.freeze({
      ...output,
      shards: output.shards ? Object.freeze([...output.shards]) : undefined,
    });
  }
}

function encodeUserAgent(value: UserAgent): Uint8Array {
  const writer = new ByteWriter();
  writeBytesField(writer, 1, encodeAppVersion(value.appVersion));
  writeUInt32Field(writer, 2, value.platform === "ANDROID" ? 1 : 14);
  if (value.releaseChannel !== undefined) writeUInt32Field(writer, 3, value.releaseChannel);
  if (value.osVersion !== undefined) writeStringField(writer, 4, value.osVersion);
  if (value.device !== undefined) writeStringField(writer, 5, value.device);
  if (value.osBuildNumber !== undefined) writeStringField(writer, 6, value.osBuildNumber);
  if (value.localeLanguageIso6391 !== undefined) writeStringField(writer, 7, value.localeLanguageIso6391);
  if (value.mcc !== undefined) writeStringField(writer, 8, value.mcc);
  if (value.mnc !== undefined) writeStringField(writer, 9, value.mnc);
  if (value.localeCountryIso31661Alpha2 !== undefined) {
    writeStringField(writer, 10, value.localeCountryIso31661Alpha2);
  }
  return writer.toUint8Array();
}

function encodeAppVersion(value: UserAgent["appVersion"]): Uint8Array {
  const writer = new ByteWriter();
  writeUInt32Field(writer, 1, value.primary);
  writeUInt32Field(writer, 2, value.secondary);
  writeUInt32Field(writer, 3, value.tertiary);
  return writer.toUint8Array();
}

function encodeWebInfo(value: WebInfo): Uint8Array {
  const writer = new ByteWriter();
  if (value.webSubPlatform !== undefined) writeUInt32Field(writer, 1, value.webSubPlatform);
  return writer.toUint8Array();
}

function encodeDevicePairingData(value: DevicePairingData): Uint8Array {
  const writer = new ByteWriter();
  writeBytesField(writer, 1, value.buildHash);
  writeBytesField(writer, 2, value.deviceProps);
  writeBytesField(writer, 3, value.eRegid);
  writeBytesField(writer, 4, value.eKeytype);
  writeBytesField(writer, 5, value.eIdent);
  writeBytesField(writer, 6, value.eSkeyId);
  writeBytesField(writer, 7, value.eSkeyVal);
  writeBytesField(writer, 8, value.eSkeySig);
  return writer.toUint8Array();
}

function decodeUserAgent(
  input: Uint8Array,
  limits: ClientPayloadCodecLimits,
): UserAgent {
  const reader = new ByteReader(input);
  let appVersion: UserAgent["appVersion"] | undefined;
  let platform: UserAgent["platform"] = "WEB";
  let releaseChannel: number | undefined;
  let osVersion: string | undefined;
  let device: string | undefined;
  let osBuildNumber: string | undefined;
  let localeLanguageIso6391: string | undefined;
  let mcc: string | undefined;
  let mnc: string | undefined;
  let localeCountryIso31661Alpha2: string | undefined;

  while (!reader.eof) {
    const { fieldNumber, wireType } = readTag(reader);
    switch (fieldNumber) {
      case 1:
        requireWire(wireType, 2);
        appVersion = decodeAppVersion(readBytes(reader, limits.maxFieldBytes));
        break;
      case 2:
        requireWire(wireType, 0);
        platform = readUInt32(reader) === 1 ? "ANDROID" : "WEB";
        break;
      case 3:
        requireWire(wireType, 0);
        releaseChannel = readUInt32(reader);
        break;
      case 4:
        requireWire(wireType, 2);
        osVersion = readString(reader, limits.maxFieldBytes);
        break;
      case 5:
        requireWire(wireType, 2);
        device = readString(reader, limits.maxFieldBytes);
        break;
      case 6:
        requireWire(wireType, 2);
        osBuildNumber = readString(reader, limits.maxFieldBytes);
        break;
      case 7:
        requireWire(wireType, 2);
        localeLanguageIso6391 = readString(reader, limits.maxFieldBytes);
        break;
      case 8:
        requireWire(wireType, 2);
        mcc = readString(reader, limits.maxFieldBytes);
        break;
      case 9:
        requireWire(wireType, 2);
        mnc = readString(reader, limits.maxFieldBytes);
        break;
      case 10:
        requireWire(wireType, 2);
        localeCountryIso31661Alpha2 = readString(reader, limits.maxFieldBytes);
        break;
      default:
        skip(reader, wireType, limits.maxFieldBytes);
    }
  }

  return Object.freeze({
    appVersion: appVersion ?? { primary: 0, secondary: 0, tertiary: 0 },
    platform,
    ...(releaseChannel === undefined ? {} : { releaseChannel }),
    ...(osVersion === undefined ? {} : { osVersion }),
    ...(device === undefined ? {} : { device }),
    ...(osBuildNumber === undefined ? {} : { osBuildNumber }),
    ...(localeLanguageIso6391 === undefined ? {} : { localeLanguageIso6391 }),
    ...(mcc === undefined ? {} : { mcc }),
    ...(mnc === undefined ? {} : { mnc }),
    ...(localeCountryIso31661Alpha2 === undefined ? {} : { localeCountryIso31661Alpha2 }),
  });
}

function decodeAppVersion(input: Uint8Array): UserAgent["appVersion"] {
  const reader = new ByteReader(input);
  const values = { primary: 0, secondary: 0, tertiary: 0 };
  while (!reader.eof) {
    const { fieldNumber, wireType } = readTag(reader);
    if (wireType !== 0) {
      skip(reader, wireType, 1024);
      continue;
    }
    if (fieldNumber === 1) values.primary = readUInt32(reader);
    else if (fieldNumber === 2) values.secondary = readUInt32(reader);
    else if (fieldNumber === 3) values.tertiary = readUInt32(reader);
    else skip(reader, wireType, 1024);
  }
  return Object.freeze(values);
}

function decodeWebInfo(
  input: Uint8Array,
  limits: ClientPayloadCodecLimits,
): WebInfo {
  const reader = new ByteReader(input);
  let webSubPlatform: number | undefined;

  while (!reader.eof) {
    const { fieldNumber, wireType } = readTag(reader);
    if (fieldNumber === 1 && wireType === 0) {
      webSubPlatform = readUInt32(reader);
    } else {
      skip(reader, wireType, limits.maxFieldBytes);
    }
  }

  return Object.freeze({
    ...(webSubPlatform === undefined ? {} : { webSubPlatform }),
  });
}

function decodeDevicePairingData(
  input: Uint8Array,
  limits: ClientPayloadCodecLimits,
): DevicePairingData {
  const reader = new ByteReader(input);
  const fields: Record<number, Uint8Array> = {};

  while (!reader.eof) {
    const { fieldNumber, wireType } = readTag(reader);
    if (wireType === 2) {
      fields[fieldNumber] = readBytes(reader, limits.maxFieldBytes);
    } else {
      skip(reader, wireType, limits.maxFieldBytes);
    }
  }

  const names = [
    "buildHash",
    "deviceProps",
    "eRegid",
    "eKeytype",
    "eIdent",
    "eSkeyId",
    "eSkeyVal",
    "eSkeySig",
  ] as const;

  for (let i = 0; i < names.length; i += 1) {
    if (!fields[i + 1]) {
      throw new ClientPayloadError(
        "CLIENT_PAYLOAD_MALFORMED",
        `DevicePairingData.${names[i]} is required.`,
      );
    }
  }

  return Object.freeze({
    buildHash: fields[1]!,
    deviceProps: fields[2]!,
    eRegid: fields[3]!,
    eKeytype: fields[4]!,
    eIdent: fields[5]!,
    eSkeyId: fields[6]!,
    eSkeyVal: fields[7]!,
    eSkeySig: fields[8]!,
  });
}

function requireWire(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new ClientPayloadError(
      "CLIENT_PAYLOAD_MALFORMED",
      `Unexpected protobuf wire type ${actual}; expected ${expected}.`,
    );
  }
}
