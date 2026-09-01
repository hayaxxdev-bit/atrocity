import { CompatibilityError } from "./compatibility-errors.js";
import type {
  CompatibilityVector,
  CompatibilityVectorKind,
} from "./compatibility-types.js";

export type EncodedValue = Uint8Array | string | unknown;

export class CompatibilityVectorCodec {
  decode(
    kind: CompatibilityVectorKind,
    value: string,
  ): EncodedValue {
    try {
      switch (kind) {
        case "bytes":
          return decodeHex(value);
        case "text":
          return value;
        case "json":
          return JSON.parse(value);
      }
    } catch (error) {
      throw new CompatibilityError(
        "COMPAT_VECTOR_DECODE",
        `Failed to decode ${kind} compatibility value.`,
        { cause: error },
      );
    }
  }

  normalize(
    kind: CompatibilityVectorKind,
    value: EncodedValue,
  ): string {
    switch (kind) {
      case "bytes":
        if (!(value instanceof Uint8Array)) {
          throw new CompatibilityError(
            "COMPAT_VECTOR_INVALID",
            "Byte vector value must be Uint8Array.",
          );
        }
        return toHex(value);

      case "text":
        if (typeof value !== "string") {
          throw new CompatibilityError(
            "COMPAT_VECTOR_INVALID",
            "Text vector value must be string.",
          );
        }
        return value;

      case "json":
        return stableStringify(value);
    }
  }
}

function decodeHex(value: string): Uint8Array {
  const normalized = value.replace(/^0x/i, "").replace(/\s+/g, "");

  if (!/^(?:[0-9a-fA-F]{2})*$/.test(normalized)) {
    throw new Error("Invalid hex.");
  }

  const output = new Uint8Array(normalized.length / 2);

  for (let i = 0; i < output.length; i += 1) {
    output[i] = Number.parseInt(
      normalized.slice(i * 2, i * 2 + 2),
      16,
    );
  }

  return output;
}

function toHex(value: Uint8Array): string {
  let output = "";

  for (const byte of value) {
    output += byte.toString(16).padStart(2, "0");
  }

  return output;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, sortValue(object[key])]),
    );
  }

  return value;
}

export function validateVector(
  vector: CompatibilityVector,
): void {
  if (!vector.id || !vector.input) {
    throw new CompatibilityError(
      "COMPAT_VECTOR_INVALID",
      "Compatibility vector requires id and input.",
    );
  }

  if (!["bytes", "text", "json"].includes(vector.kind)) {
    throw new CompatibilityError(
      "COMPAT_VECTOR_INVALID",
      `Unsupported vector kind "${vector.kind}".`,
    );
  }
}
