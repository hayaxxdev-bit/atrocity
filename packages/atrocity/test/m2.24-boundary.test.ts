import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("message encryptor source does not import private session internals", async () => {
  const source = await readFile(
    join(process.cwd(), "src/signal/message/whatsapp-message-encryptor.ts"),
    "utf8",
  );

  assert.equal(source.includes("../ratchet/"), false);
  assert.equal(source.includes("../persistence/"), false);
  assert.equal(source.includes("privateKey"), false);
});
