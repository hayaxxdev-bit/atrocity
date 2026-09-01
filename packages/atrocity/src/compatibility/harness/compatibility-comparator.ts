import { CompatibilityVectorCodec } from "./compatibility-codec.js";
import type {
  CompatibilityComparison,
  CompatibilityMismatch,
  CompatibilityVector,
} from "./compatibility-types.js";

export class CompatibilityComparator {
  constructor(
    private readonly codec = new CompatibilityVectorCodec(),
  ) {}

  compare(
    vector: CompatibilityVector,
    actual: unknown,
  ): CompatibilityComparison {
    const expected = this.codec.decode(
      vector.kind,
      vector.expected,
    );

    const normalizedExpected =
      this.codec.normalize(vector.kind, expected);

    const normalizedActual =
      this.codec.normalize(vector.kind, actual);

    if (normalizedExpected === normalizedActual) {
      return Object.freeze({
        vectorId: vector.id,
        compatible: true,
        mismatches: Object.freeze([]),
      });
    }

    return Object.freeze({
      vectorId: vector.id,
      compatible: false,
      mismatches: Object.freeze([
        mismatchFor(
          vector.kind,
          normalizedExpected,
          normalizedActual,
        ),
      ]),
    });
  }
}

function mismatchFor(
  kind: CompatibilityVector["kind"],
  expected: string,
  actual: string,
): CompatibilityMismatch {
  if (kind === "bytes") {
    return Object.freeze({
      kind:
        expected.length !== actual.length
          ? "BYTE_LENGTH_MISMATCH"
          : "VALUE_MISMATCH",
      path: "$",
      expected,
      actual,
    });
  }

  return Object.freeze({
    kind: "VALUE_MISMATCH",
    path: "$",
    expected,
    actual,
  });
}
