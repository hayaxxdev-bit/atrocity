import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientPayloadCodec,
  buildLoginPayload,
  buildRegistrationPayload,
} from "../src/auth/index.js";

const codec = new ClientPayloadCodec();

test("builds a login payload with current-reference fields", () => {
  const payload = buildLoginPayload({
    username: 1234567890n,
    device: 0,
    appVersion: { primary: 2, secondary: 3000, tertiary: 1 },
    countryCode: "ID",
    pushName: "Atrocity",
  });

  const decoded = codec.decode(codec.encode(payload));

  assert.equal(decoded.username, 1234567890n);
  assert.equal(decoded.device, 0);
  assert.equal(decoded.passive, true);
  assert.equal(decoded.pull, true);
  assert.equal(decoded.lidDbMigrated, false);
  assert.equal(decoded.userAgent?.platform, "WEB");
  assert.equal(decoded.userAgent?.localeCountryIso31661Alpha2, "ID");
});

test("round-trips registration pairing data", () => {
  const pairing = {
    buildHash: new Uint8Array([1]),
    deviceProps: new Uint8Array([2]),
    eRegid: new Uint8Array([3]),
    eKeytype: new Uint8Array([4]),
    eIdent: new Uint8Array([5]),
    eSkeyId: new Uint8Array([6]),
    eSkeyVal: new Uint8Array([7]),
    eSkeySig: new Uint8Array([8]),
  } as const;

  const payload = buildRegistrationPayload({
    appVersion: { primary: 2, secondary: 3000, tertiary: 1 },
    countryCode: "ID",
    pairing,
  });

  const decoded = codec.decode(codec.encode(payload));

  assert.equal(decoded.passive, false);
  assert.equal(decoded.pull, false);
  assert.deepEqual([...decoded.devicePairingData!.eSkeySig], [8]);
});

test("preserves unknown protobuf fields", () => {
  const base = codec.encode({
    connectType: 0,
    connectReason: 0,
  });

  // field 100, length-delimited, value [9]
  const extended = new Uint8Array([
    ...base,
    0xa2, 0x06, 0x01, 0x09,
  ]);

  assert.doesNotThrow(() => codec.decode(extended));
});
