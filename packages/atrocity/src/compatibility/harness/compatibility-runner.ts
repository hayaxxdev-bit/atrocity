import {
  CompatibilityError,
} from "./compatibility-errors.js";
import {
  validateVector,
  type EncodedValue,
} from "./compatibility-codec.js";
import {
  CompatibilityComparator,
} from "./compatibility-comparator.js";
import type {
  CompatibilityRunnerResult,
  CompatibilityVector,
} from "./compatibility-types.js";

export type CompatibilityExecutor = (
  vector: CompatibilityVector,
  decodedInput: EncodedValue,
) => unknown | Promise<unknown>;

export class CompatibilityRunner {
  private readonly vectors = new Map<string, CompatibilityVector>();

  constructor(
    private readonly comparator = new CompatibilityComparator(),
  ) {}

  add(vector: CompatibilityVector): void {
    validateVector(vector);

    if (this.vectors.has(vector.id)) {
      throw new CompatibilityError(
        "COMPAT_VECTOR_DUPLICATE",
        `Compatibility vector "${vector.id}" already exists.`,
      );
    }

    this.vectors.set(vector.id, Object.freeze({
      ...vector,
      ...(vector.metadata
        ? { metadata: Object.freeze({ ...vector.metadata }) }
        : {}),
    }));
  }

  addAll(
    vectors: readonly CompatibilityVector[],
  ): void {
    for (const vector of vectors) this.add(vector);
  }

  list(): readonly CompatibilityVector[] {
    return Object.freeze([...this.vectors.values()]);
  }

  async run(
    executor: CompatibilityExecutor,
  ): Promise<CompatibilityRunnerResult> {
    const results = [];

    for (const vector of this.vectors.values()) {
      try {
        const input = decodeInput(vector);
        const actual = await executor(vector, input);

        results.push(
          this.comparator.compare(vector, actual),
        );
      } catch (error) {
        results.push({
          vectorId: vector.id,
          compatible: false,
          mismatches: Object.freeze([
            {
              kind: "VALUE_MISMATCH" as const,
              path: "$execution",
              expected: vector.expected,
              actual: formatError(error),
            },
          ]),
        });
      }
    }

    const passed = results.filter(
      (result) => result.compatible,
    ).length;

    return Object.freeze({
      passed,
      failed: results.length - passed,
      results: Object.freeze(results),
    });
  }
}

function decodeInput(
  vector: CompatibilityVector,
): EncodedValue {
  switch (vector.kind) {
    case "bytes":
      return new Uint8Array(
        vector.input
          .replace(/^0x/i, "")
          .replace(/\s+/g, "")
          .match(/../g)!
          .map((pair) => Number.parseInt(pair, 16)),
      );
    case "text":
      return vector.input;
    case "json":
      return JSON.parse(vector.input);
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}
