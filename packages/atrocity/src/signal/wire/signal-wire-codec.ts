import { ByteFormatError, ByteReader, ByteWriter } from "../../foundation/bytes/index.js";
import {
  DEFAULT_SIGNAL_WIRE_LIMITS,
  type SignalWireDecodeLimits,
  type SignalWireMessage,
} from "./signal-wire-types.js";
import { SignalWireError } from "./signal-wire-errors.js";
import {
  readBytes,
  readTag,
  readUInt32,
  skip,
  writeBytesField,
  writeUInt32Field,
} from "./wire-primitives.js";

const VERSION_FIELD = 1;
const RATCHET_KEY_FIELD = 2;
const PREVIOUS_CHAIN_LENGTH_FIELD = 3;
const MESSAGE_NUMBER_FIELD = 4;
const CIPHERTEXT_FIELD = 5;
const VERSION = 1;

export class SignalWireCodec {
  constructor(
    private readonly limits: SignalWireDecodeLimits = DEFAULT_SIGNAL_WIRE_LIMITS,
  ) {
    if (
      limits.maxMessageBytes <= 0 ||
      limits.maxCiphertextBytes <= 0 ||
      !Number.isSafeInteger(limits.maxMessageBytes) ||
      !Number.isSafeInteger(limits.maxCiphertextBytes)
    ) {
      throw new RangeError("Signal wire decode limits must be positive safe integers.");
    }
  }

  encode(message: SignalWireMessage): Uint8Array {
    validateMessage(message);

    const writer = new ByteWriter();
    writeUInt32Field(writer, VERSION_FIELD, VERSION);
    writeBytesField(writer, RATCHET_KEY_FIELD, message.header.ratchetKey);
    writeUInt32Field(
      writer,
      PREVIOUS_CHAIN_LENGTH_FIELD,
      message.header.previousChainLength,
    );
    writeUInt32Field(
      writer,
      MESSAGE_NUMBER_FIELD,
      message.header.messageNumber,
    );
    writeBytesField(writer, CIPHERTEXT_FIELD, message.ciphertext);

    const encoded = writer.toUint8Array();
    if (encoded.byteLength > this.limits.maxMessageBytes) {
      throw new SignalWireError(
        "SIGNAL_WIRE_TOO_LARGE",
        "Signal wire message exceeds configured size limit.",
      );
    }
    return encoded;
  }

  decode(input: Uint8Array): SignalWireMessage {
    if (input.byteLength > this.limits.maxMessageBytes) {
      throw new SignalWireError(
        "SIGNAL_WIRE_TOO_LARGE",
        "Signal wire message exceeds configured size limit.",
      );
    }

    try {
      const reader = new ByteReader(input);
      let version: number | undefined;
      let ratchetKey: Uint8Array | undefined;
      let previousChainLength: number | undefined;
      let messageNumber: number | undefined;
      let ciphertext: Uint8Array | undefined;

      while (!reader.eof) {
        const { fieldNumber, wireType } = readTag(reader);

        if (fieldNumber === VERSION_FIELD) {
          requireWire(wireType, 0);
          if (version !== undefined) throw duplicateField("version");
          version = readUInt32(reader);
        } else if (fieldNumber === RATCHET_KEY_FIELD) {
          requireWire(wireType, 2);
          if (ratchetKey) throw duplicateField("ratchetKey");
          ratchetKey = readBytes(reader, 32);
        } else if (fieldNumber === PREVIOUS_CHAIN_LENGTH_FIELD) {
          requireWire(wireType, 0);
          if (previousChainLength !== undefined) {
            throw duplicateField("previousChainLength");
          }
          previousChainLength = readUInt32(reader);
        } else if (fieldNumber === MESSAGE_NUMBER_FIELD) {
          requireWire(wireType, 0);
          if (messageNumber !== undefined) throw duplicateField("messageNumber");
          messageNumber = readUInt32(reader);
        } else if (fieldNumber === CIPHERTEXT_FIELD) {
          requireWire(wireType, 2);
          if (ciphertext) throw duplicateField("ciphertext");
          ciphertext = readBytes(reader, this.limits.maxCiphertextBytes);
        } else {
          skip(reader, wireType, this.limits.maxCiphertextBytes);
        }
      }

      if (version !== VERSION) {
        throw new SignalWireError(
          "SIGNAL_WIRE_UNSUPPORTED",
          `Unsupported Signal wire version: ${String(version)}.`,
        );
      }

      if (!ratchetKey || previousChainLength === undefined ||
          messageNumber === undefined || !ciphertext) {
        throw new SignalWireError(
          "SIGNAL_WIRE_MALFORMED",
          "Signal wire message is missing required fields.",
        );
      }

      const result = {
        header: {
          ratchetKey,
          previousChainLength,
          messageNumber,
        },
        ciphertext,
      } satisfies SignalWireMessage;

      validateMessage(result);
      return Object.freeze({
        header: Object.freeze({
          ratchetKey: result.header.ratchetKey.slice(),
          previousChainLength: result.header.previousChainLength,
          messageNumber: result.header.messageNumber,
        }),
        ciphertext: result.ciphertext.slice(),
      });
    } catch (error) {
      if (error instanceof SignalWireError) throw error;
      if (error instanceof ByteFormatError) {
        throw new SignalWireError(
          "SIGNAL_WIRE_MALFORMED",
          "Malformed Signal wire message.",
          { cause: error },
        );
      }
      throw new SignalWireError(
        "SIGNAL_WIRE_MALFORMED",
        "Failed to decode Signal wire message.",
        { cause: error },
      );
    }
  }
}

function validateMessage(message: SignalWireMessage): void {
  if (
    !(message.header.ratchetKey instanceof Uint8Array) ||
    message.header.ratchetKey.byteLength !== 32
  ) {
    throw new SignalWireError(
      "SIGNAL_WIRE_INVALID",
      "Signal wire ratchet key must be exactly 32 bytes.",
    );
  }

  if (
    !Number.isSafeInteger(message.header.previousChainLength) ||
    message.header.previousChainLength < 0 ||
    !Number.isSafeInteger(message.header.messageNumber) ||
    message.header.messageNumber < 0
  ) {
    throw new SignalWireError(
      "SIGNAL_WIRE_INVALID",
      "Signal wire message counters must be non-negative safe integers.",
    );
  }

  if (
    !(message.ciphertext instanceof Uint8Array) ||
    message.ciphertext.length === 0
  ) {
    throw new SignalWireError(
      "SIGNAL_WIRE_INVALID",
      "Signal wire ciphertext must be non-empty bytes.",
    );
  }
}

function requireWire(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new SignalWireError(
      "SIGNAL_WIRE_MALFORMED",
      `Unexpected protobuf wire type ${actual}; expected ${expected}.`,
    );
  }
}

function duplicateField(name: string): never {
  throw new SignalWireError(
    "SIGNAL_WIRE_MALFORMED",
    `Duplicate Signal wire field: ${name}.`,
  );
}
