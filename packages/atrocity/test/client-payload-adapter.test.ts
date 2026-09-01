
import assert from "node:assert/strict";
import test from "node:test";
import {
  ClientPayloadAdapter,
  validateLoginPayload,
  validateRegistrationPayload,
} from "../src/auth/payload/index.js";

const base = { appVersion: { primary: 2, secondary: 3000, tertiary: 1 } };

test("login payload validates its profile", () => {
  const adapter = new ClientPayloadAdapter();
  const payload = adapter.buildLogin({ ...base, username: 123n, device: 0 });
  assert.equal(payload.passive, true);
  assert.equal(payload.pull, true);
  validateLoginPayload(payload);
});

test("registration payload validates pairing data", () => {
  const adapter = new ClientPayloadAdapter();
  const b = (n: number) => new Uint8Array(n).fill(1);
  const payload = adapter.buildRegistration({
    ...base,
    pairing: {
      buildHash: b(16), deviceProps: b(8), eRegid: b(4), eKeytype: b(1),
      eIdent: b(32), eSkeyId: b(4), eSkeyVal: b(32), eSkeySig: b(64),
    },
  });
  assert.equal(payload.passive, false);
  assert.equal(payload.pull, false);
  validateRegistrationPayload(payload);
});

test("missing login identity is rejected", () => {
  const adapter = new ClientPayloadAdapter();
  const payload = adapter.buildLogin({ ...base, username: 123n, device: 0 });
  assert.throws(() => validateLoginPayload({ ...payload, username: undefined }));
});

test("roundtrip preserves core fields", () => {
  const adapter = new ClientPayloadAdapter();
  const payload = adapter.buildLogin({
    ...base, username: 123n, device: 1, pushName: "Atrocity",
  });
  const roundTrip = adapter.roundTrip(payload);
  assert.equal(roundTrip.username, 123n);
  assert.equal(roundTrip.device, 1);
  assert.equal(roundTrip.pushName, "Atrocity");
});
