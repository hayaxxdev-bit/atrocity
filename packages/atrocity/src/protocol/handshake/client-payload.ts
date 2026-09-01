export type ClientPayloadBytes = Uint8Array & { readonly __brand: "AtrocityClientPayloadBytes" };

export function asClientPayloadBytes(value: Uint8Array): ClientPayloadBytes {
  if (!(value instanceof Uint8Array) || value.byteLength === 0) {
    throw new TypeError("ClientPayload must be a non-empty Uint8Array.");
  }
  return value.slice() as ClientPayloadBytes;
}
