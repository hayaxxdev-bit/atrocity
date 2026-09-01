import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEncryptDigestIq,
  buildEncryptPreKeyUploadIq,
  buildPassiveIq,
  buildRemoveCompanionDeviceIq,
  buildWamStatsIq,
} from "../src/protocol/index.js";

test("encrypt digest IQ matches target namespace shape", () => {
  const node = buildEncryptDigestIq("q1");

  assert.equal(node.tag, "iq");
  assert.equal(node.attrs.id, "q1");
  assert.equal(node.attrs.to, "s.whatsapp.net");
  assert.equal(node.attrs.type, "get");
  assert.equal(node.attrs.xmlns, "encrypt");
  assert.equal((node.content as any)[0].tag, "digest");
});

test("passive IQ selects active/passive child without changing namespace", () => {
  const node = buildPassiveIq("q2", "active");

  assert.equal(node.attrs.xmlns, "passive");
  assert.equal(node.attrs.type, "set");
  assert.equal((node.content as any)[0].tag, "active");
});

test("companion removal IQ validates jid and namespace", () => {
  const node = buildRemoveCompanionDeviceIq(
    "q3",
    "123@s.whatsapp.net",
  );

  assert.equal(node.attrs.xmlns, "md");
  const child = (node.content as any)[0];
  assert.equal(child.tag, "remove-companion-device");
  assert.equal(child.attrs.jid, "123@s.whatsapp.net");
});

test("pre-key upload rejects empty bundles", () => {
  assert.throws(() =>
    buildEncryptPreKeyUploadIq("q4", []),
  );
});

test("WAM statistics IQ carries binary payload and timestamp", () => {
  const node = buildWamStatsIq(
    "q5",
    new Uint8Array([1,2,3]),
    123,
  );

  assert.equal(node.attrs.xmlns, "w:stats");
  const add = (node.content as any)[0];
  assert.equal(add.tag, "add");
  assert.equal(add.attrs.t, "123");
  assert.equal(add.content.kind, "binary");
});
