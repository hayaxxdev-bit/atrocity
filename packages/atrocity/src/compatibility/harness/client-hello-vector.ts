import type { CompatibilityVector } from "./compatibility-types.js";

export function createClientHelloVector(
  id: string,
  ephemeralPublicKeyHex: string,
  expectedWireHex: string,
): CompatibilityVector {
  return Object.freeze({
    id,
    kind: "bytes",
    description: "WhatsApp ClientHello encoded wire vector.",
    input: ephemeralPublicKeyHex,
    expected: expectedWireHex,
    metadata: Object.freeze({
      protocolMessage: "clientHello",
    }),
  });
}
