
import type { ClientPayload, DevicePairingData } from "./client-payload-types.js";
import { ClientPayloadError } from "./client-payload-errors.js";

export function validateLoginPayload(payload: ClientPayload): void {
  if (payload.username === undefined) fail("ClientPayload requires username.");
  if (payload.device === undefined) fail("ClientPayload requires device.");
  if (payload.userAgent === undefined) fail("ClientPayload requires userAgent.");
  if (payload.passive !== true) fail("Login payload must be passive.");
  if (payload.pull !== true) fail("Login payload must request pull.");
}

export function validateRegistrationPayload(payload: ClientPayload): void {
  if (payload.devicePairingData === undefined) {
    fail("Registration payload requires devicePairingData.");
  }
  if (payload.userAgent === undefined) {
    fail("Registration payload requires userAgent.");
  }
  if (payload.passive !== false) fail("Registration payload must not be passive.");
  if (payload.pull !== false) fail("Registration payload must not request pull.");
  validatePairingData(payload.devicePairingData!);
}

function validatePairingData(pairing: DevicePairingData): void {
  const fields: readonly (keyof DevicePairingData)[] = [
    "buildHash", "deviceProps", "eRegid", "eKeytype",
    "eIdent", "eSkeyId", "eSkeyVal", "eSkeySig",
  ];
  for (const field of fields) {
    const value = pairing[field];
    if (!(value instanceof Uint8Array) || value.byteLength === 0) {
      fail(`Registration pairing field ${String(field)} must be non-empty bytes.`, "CLIENT_PAYLOAD_MALFORMED");
    }
  }
}

function fail(
  message: string,
  code: "CLIENT_PAYLOAD_INVALID" | "CLIENT_PAYLOAD_MALFORMED" = "CLIENT_PAYLOAD_INVALID",
): never {
  throw new ClientPayloadError(code, message);
}
