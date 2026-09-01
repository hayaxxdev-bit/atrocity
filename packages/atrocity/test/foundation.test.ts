import assert from "node:assert/strict";
import test from "node:test";

import {
  AtrocityError,
  ErrorCode,
  InvalidArgumentError,
  Result,
  isErr,
  isOk,
} from "../src/index.js";

test("Result.ok creates a successful result", () => {
  const result = Result.ok(42);
  assert.equal(result.ok, true);
  assert.equal(isOk(result), true);
  if (isOk(result)) assert.equal(result.value, 42);
});

test("Result.err creates a failure result", () => {
  const error = new InvalidArgumentError("bad input");
  const result = Result.err(error);
  assert.equal(result.ok, false);
  assert.equal(isErr(result), true);
  if (isErr(result)) assert.equal(result.error.code, ErrorCode.INVALID_ARGUMENT);
});

test("AtrocityError carries a stable code and cause", () => {
  const cause = new Error("root cause");
  const error = new AtrocityError(ErrorCode.INTERNAL, "failed", { cause });
  assert.equal(error.code, ErrorCode.INTERNAL);
  assert.equal((error as Error & { cause?: unknown }).cause, cause);
  assert.equal(error.name, "AtrocityError");
});
