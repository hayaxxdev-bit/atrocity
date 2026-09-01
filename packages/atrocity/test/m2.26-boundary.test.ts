import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("WAMessage codec is an injected boundary", async () => {
  const source = await readFile(join(process.cwd(), "src/protocol/protobuf/wa-message-codec.ts"), "utf8");
  assert.equal(source.includes("WAMessageBinaryCodec"), true);
  assert.equal(source.includes("privateKey"), false);
});
