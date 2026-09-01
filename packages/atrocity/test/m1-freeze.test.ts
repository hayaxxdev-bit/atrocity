import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("root public entrypoint exposes only facade-level exports", async () => {
  const source = await readFile(
    join(process.cwd(), "src/index.ts"),
    "utf8",
  );

  assert.equal(source.includes('./client/public-api.js'), true);
  assert.equal(source.includes('./crypto/index.js'), false);
  assert.equal(source.includes('./connection/index.js'), false);
  assert.equal(source.includes('./signal/index.js'), false);
});

test("protocol event bus contains no explicit any token", async () => {
  const source = await readFile(
    join(
      process.cwd(),
      "src/protocol/events/protocol-event-bus.ts",
    ),
    "utf8",
  );

  assert.equal(/\bany\b/.test(source), false);
});
