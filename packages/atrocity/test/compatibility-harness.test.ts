import assert from "node:assert/strict";
import test from "node:test";
import {
  CompatibilityRunner,
  CompatibilityComparator,
  CORE_COMPATIBILITY_VECTORS,
} from "../src/compatibility/index.js";

test("core compatibility fixtures pass", async () => {
  const runner = new CompatibilityRunner();
  runner.addAll(CORE_COMPATIBILITY_VECTORS);

  const result = await runner.run(async (_vector, input) => input);

  assert.equal(result.passed, 3);
  assert.equal(result.failed, 0);
});

test("byte mismatches are reported deterministically", () => {
  const comparator = new CompatibilityComparator();

  const result = comparator.compare(
    CORE_COMPATIBILITY_VECTORS[0]!,
    new Uint8Array([0, 1, 2, 3, 4, 6]),
  );

  assert.equal(result.compatible, false);
  assert.equal(result.mismatches[0]?.kind, "VALUE_MISMATCH");
});

test("duplicate vector ids are rejected", () => {
  const runner = new CompatibilityRunner();
  runner.add(CORE_COMPATIBILITY_VECTORS[0]!);

  assert.throws(() =>
    runner.add(CORE_COMPATIBILITY_VECTORS[0]!),
  );
});

test("runner captures executor failures as compatibility failures", async () => {
  const runner = new CompatibilityRunner();
  runner.add({
    id: "failure",
    kind: "text",
    input: "x",
    expected: "y",
  });

  const result = await runner.run(() => {
    throw new Error("reference unavailable");
  });

  assert.equal(result.passed, 0);
  assert.equal(result.failed, 1);
  assert.equal(result.results[0]?.compatible, false);
});
