import type { CompatibilityVector } from "./compatibility-types.js";

export const CORE_COMPATIBILITY_VECTORS: readonly CompatibilityVector[] =
  Object.freeze([
    Object.freeze({
      id: "bytes.echo.01",
      kind: "bytes",
      description: "Deterministic byte echo baseline.",
      input: "000102030405",
      expected: "000102030405",
    }),
    Object.freeze({
      id: "text.echo.01",
      kind: "text",
      description: "UTF-8/text baseline.",
      input: "atrocity",
      expected: "atrocity",
    }),
    Object.freeze({
      id: "json.canonical.01",
      kind: "json",
      description: "Canonical JSON ordering baseline.",
      input: JSON.stringify({ b: 2, a: 1 }),
      expected: JSON.stringify({ a: 1, b: 2 }),
    }),
  ]);
