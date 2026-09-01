import { ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
import {
  DEFAULT_HANDSHAKE_DECODE_LIMITS,
  type ClientFinish,
  type ClientHello,
  type HandshakeDecodeLimits,
  type HandshakeMessage,
  type ServerHello,
} from "./handshake-types.js";
import { readBytesField, readTag, skipField, writeBytesField } from "./protobuf-wire.js";

const OUTER_CLIENT_HELLO = 2;
const OUTER_SERVER_HELLO = 3;
const OUTER_CLIENT_FINISH = 4;

const F_EPHEMERAL = 1;
const F_STATIC = 2;
const F_PAYLOAD = 3;

export class HandshakeMessageCodec {
  constructor(private readonly limits: HandshakeDecodeLimits = DEFAULT_HANDSHAKE_DECODE_LIMITS) {}

  encode(message: HandshakeMessage): Uint8Array {
    const writer = new ByteWriter();
    switch (message.type) {
      case "clientHello":
        writeBytesField(writer, OUTER_CLIENT_HELLO, encodeClientHello(message.clientHello));
        break;
      case "serverHello":
        writeBytesField(writer, OUTER_SERVER_HELLO, encodeServerHello(message.serverHello));
        break;
      case "clientFinish":
        writeBytesField(writer, OUTER_CLIENT_FINISH, encodeClientFinish(message.clientFinish));
        break;
    }
    const out = writer.toUint8Array();
    if (out.byteLength > this.limits.maxMessageBytes) throw new ByteFormatError("Handshake message exceeds limit.");
    return out;
  }

  decode(input: Uint8Array): HandshakeMessage {
    if (input.byteLength > this.limits.maxMessageBytes) throw new ByteFormatError("Handshake message exceeds limit.");
    const reader = new ByteReader(input);
    let result: HandshakeMessage | undefined;

    while (!reader.eof) {
      const { fieldNumber, wireType } = readTag(reader);
      if (wireType !== 2) { skipField(reader, wireType, this.limits.maxFieldBytes); continue; }
      const field = readBytesField(reader, this.limits.maxFieldBytes);

      if (fieldNumber === OUTER_CLIENT_HELLO) {
        if (result) throw new ByteFormatError("HandshakeMessage contains multiple variants.");
        result = { type: "clientHello", clientHello: decodeClientHello(field, this.limits) };
      } else if (fieldNumber === OUTER_SERVER_HELLO) {
        if (result) throw new ByteFormatError("HandshakeMessage contains multiple variants.");
        result = { type: "serverHello", serverHello: decodeServerHello(field, this.limits) };
      } else if (fieldNumber === OUTER_CLIENT_FINISH) {
        if (result) throw new ByteFormatError("HandshakeMessage contains multiple variants.");
        result = { type: "clientFinish", clientFinish: decodeClientFinish(field, this.limits) };
      }
      // Unknown fields remain forward-compatible.
    }

    if (!result) throw new ByteFormatError("HandshakeMessage contains no supported variant.");
    return result;
  }
}

function encodeClientHello(value: ClientHello): Uint8Array {
  requireBytes(value.ephemeral, "clientHello.ephemeral");
  const writer = new ByteWriter();
  writeBytesField(writer, F_EPHEMERAL, value.ephemeral);
  return writer.toUint8Array();
}

function encodeServerHello(value: ServerHello): Uint8Array {
  requireBytes(value.ephemeral, "serverHello.ephemeral");
  const writer = new ByteWriter();
  writeBytesField(writer, F_EPHEMERAL, value.ephemeral);
  if (value.static) writeBytesField(writer, F_STATIC, value.static);
  if (value.payload) writeBytesField(writer, F_PAYLOAD, value.payload);
  return writer.toUint8Array();
}

function encodeClientFinish(value: ClientFinish): Uint8Array {
  requireBytes(value.static, "clientFinish.static");
  requireBytes(value.payload, "clientFinish.payload");
  const writer = new ByteWriter();
  writeBytesField(writer, F_STATIC, value.static);
  writeBytesField(writer, F_PAYLOAD, value.payload);
  return writer.toUint8Array();
}

function decodeClientHello(input: Uint8Array, limits: HandshakeDecodeLimits): ClientHello {
  const r = new ByteReader(input);
  let ephemeral: Uint8Array | undefined;
  while (!r.eof) {
    const { fieldNumber, wireType } = readTag(r);
    if (fieldNumber === F_EPHEMERAL && wireType === 2) {
      if (ephemeral) throw new ByteFormatError("Duplicate clientHello.ephemeral.");
      ephemeral = readBytesField(r, limits.maxFieldBytes);
    } else skipField(r, wireType, limits.maxFieldBytes);
  }
  if (!ephemeral) throw new ByteFormatError("clientHello.ephemeral is required.");
  return Object.freeze({ ephemeral });
}

function decodeServerHello(input: Uint8Array, limits: HandshakeDecodeLimits): ServerHello {
  const r = new ByteReader(input);
  let ephemeral: Uint8Array | undefined;
  let staticKey: Uint8Array | undefined;
  let payload: Uint8Array | undefined;

  while (!r.eof) {
    const { fieldNumber, wireType } = readTag(r);
    if (fieldNumber === F_EPHEMERAL && wireType === 2) {
      if (ephemeral) throw new ByteFormatError("Duplicate serverHello.ephemeral.");
      ephemeral = readBytesField(r, limits.maxFieldBytes);
    } else if (fieldNumber === F_STATIC && wireType === 2) {
      if (staticKey) throw new ByteFormatError("Duplicate serverHello.static.");
      staticKey = readBytesField(r, limits.maxFieldBytes);
    } else if (fieldNumber === F_PAYLOAD && wireType === 2) {
      if (payload) throw new ByteFormatError("Duplicate serverHello.payload.");
      payload = readBytesField(r, limits.maxFieldBytes);
    } else skipField(r, wireType, limits.maxFieldBytes);
  }

  if (!ephemeral) throw new ByteFormatError("serverHello.ephemeral is required.");
  return Object.freeze({
    ephemeral,
    ...(staticKey ? { static: staticKey } : {}),
    ...(payload ? { payload } : {}),
  });
}

function decodeClientFinish(input: Uint8Array, limits: HandshakeDecodeLimits): ClientFinish {
  const r = new ByteReader(input);
  let staticKey: Uint8Array | undefined;
  let payload: Uint8Array | undefined;

  while (!r.eof) {
    const { fieldNumber, wireType } = readTag(r);
    if (fieldNumber === F_STATIC && wireType === 2) {
      if (staticKey) throw new ByteFormatError("Duplicate clientFinish.static.");
      staticKey = readBytesField(r, limits.maxFieldBytes);
    } else if (fieldNumber === F_PAYLOAD && wireType === 2) {
      if (payload) throw new ByteFormatError("Duplicate clientFinish.payload.");
      payload = readBytesField(r, limits.maxFieldBytes);
    } else skipField(r, wireType, limits.maxFieldBytes);
  }

  if (!staticKey || !payload) throw new ByteFormatError("clientFinish.static and payload are required.");
  return Object.freeze({ static: staticKey, payload });
}

function requireBytes(value: Uint8Array, name: string): void {
  if (!(value instanceof Uint8Array) || value.byteLength === 0) {
    throw new ByteFormatError(`${name} must be a non-empty Uint8Array.`);
  }
}
