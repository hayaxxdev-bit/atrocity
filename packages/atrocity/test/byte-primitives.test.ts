import assert from "node:assert/strict";
import test from "node:test";
import { ByteBoundsError, ByteReader, ByteWriter } from "../src/foundation/index.js";

test("ByteWriter and ByteReader round-trip unsigned integers and UTF-8", () => {
  const writer = new ByteWriter(1);
  writer.writeByte(0xab);
  writer.writeUint16BE(0x1234);
  writer.writeUint32LE(0xdeadbeef);
  writer.writeUtf8("Atrocity");

  const reader = new ByteReader(writer.toUint8Array());
  assert.equal(reader.readByte(), 0xab);
  assert.equal(reader.readUint16BE(), 0x1234);
  assert.equal(reader.readUint32LE(), 0xdeadbeef);
  assert.equal(reader.readUtf8(new TextEncoder().encode("Atrocity").byteLength), "Atrocity");
  assert.equal(reader.eof, true);
});

test("ByteReader rejects reads beyond input", () => {
  const reader = new ByteReader(new Uint8Array([1, 2]));
  assert.throws(() => reader.readUint32BE(), ByteBoundsError);
});

test("ByteWriter rejects values outside the selected integer width", () => {
  const writer = new ByteWriter();
  assert.throws(() => writer.writeUint16BE(0x10000));
  assert.throws(() => writer.writeByte(256));
});
