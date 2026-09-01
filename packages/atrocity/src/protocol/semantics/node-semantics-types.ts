import type { ProtocolNode } from "../node/index.js";

export type NodeTag =
  | "iq"
  | "message"
  | "presence"
  | "receipt"
  | "notification"
  | "ack"
  | "stream:features"
  | "stream:stream"
  | (string & {});

export type NodePathSegment = {
  readonly tag: string;
  readonly attrs?: Readonly<Record<string, string>>;
};

export type NodePredicate = (node: ProtocolNode) => boolean;

export type ChildMatch = {
  readonly tag?: string;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly predicate?: NodePredicate;
};

export type NodeValidationIssue = {
  readonly code:
    | "TAG_MISMATCH"
    | "MISSING_ATTRIBUTE"
    | "INVALID_ATTRIBUTE"
    | "MISSING_CHILD"
    | "INVALID_CONTENT";
  readonly path: string;
  readonly message: string;
};

export type NodeValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly NodeValidationIssue[];
};
