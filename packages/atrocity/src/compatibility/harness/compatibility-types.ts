export type CompatibilityVectorKind =
  | "bytes"
  | "text"
  | "json";

export type CompatibilityVector = {
  readonly id: string;
  readonly kind: CompatibilityVectorKind;
  readonly description?: string;
  readonly input: string;
  readonly expected: string;
  readonly metadata?: Readonly<Record<string, string>>;
};

export type CompatibilityMismatchKind =
  | "MISSING"
  | "KIND_MISMATCH"
  | "BYTE_LENGTH_MISMATCH"
  | "VALUE_MISMATCH";

export type CompatibilityMismatch = {
  readonly kind: CompatibilityMismatchKind;
  readonly path: string;
  readonly expected: string;
  readonly actual: string;
};

export type CompatibilityComparison = {
  readonly vectorId: string;
  readonly compatible: boolean;
  readonly mismatches: readonly CompatibilityMismatch[];
};

export type CompatibilityRunnerResult = {
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly CompatibilityComparison[];
};
