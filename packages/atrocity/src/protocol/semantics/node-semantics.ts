import type { ProtocolNode } from "../node/index.js";
import { NodeSemanticsError } from "./node-semantics-errors.js";
import type {
  ChildMatch,
  NodePathSegment,
  NodePredicate,
  NodeValidationIssue,
  NodeValidationResult,
} from "./node-semantics-types.js";

export function getAttribute(
  node: ProtocolNode,
  name: string,
): string | undefined {
  return node.attrs[name];
}

export function requireAttribute(
  node: ProtocolNode,
  name: string,
): string {
  const value = getAttribute(node, name);
  if (value === undefined) {
    throw new NodeSemanticsError(
      "ATTRIBUTE_NOT_FOUND",
      `Node <${node.tag}> is missing attribute "${name}".`,
    );
  }
  return value;
}

export function hasAttributes(
  node: ProtocolNode,
  expected: Readonly<Record<string, string>>,
): boolean {
  return Object.entries(expected).every(
    ([key, value]) => node.attrs[key] === value,
  );
}

export function isTag(
  node: ProtocolNode | undefined,
  tag: string,
): node is ProtocolNode {
  return node?.tag === tag;
}

export function isIq(node: ProtocolNode | undefined): boolean {
  return isTag(node, "iq");
}

export function isMessage(node: ProtocolNode | undefined): boolean {
  return isTag(node, "message");
}

export function isPresence(node: ProtocolNode | undefined): boolean {
  return isTag(node, "presence");
}

export function isReceipt(node: ProtocolNode | undefined): boolean {
  return isTag(node, "receipt");
}

export function isNotification(node: ProtocolNode | undefined): boolean {
  return isTag(node, "notification");
}

export function isAck(node: ProtocolNode | undefined): boolean {
  return isTag(node, "ack");
}

export function findChild(
  node: ProtocolNode,
  match: ChildMatch,
): ProtocolNode | undefined {
  for (const child of node.content) {
    if (!isProtocolNode(child)) continue;
    if (match.tag && child.tag !== match.tag) continue;
    if (match.attrs && !hasAttributes(child, match.attrs)) continue;
    if (match.predicate && !match.predicate(child)) continue;
    return child;
  }
  return undefined;
}

export function findChildren(
  node: ProtocolNode,
  match: ChildMatch,
): readonly ProtocolNode[] {
  const result: ProtocolNode[] = [];

  for (const child of node.content) {
    if (!isProtocolNode(child)) continue;
    if (match.tag && child.tag !== match.tag) continue;
    if (match.attrs && !hasAttributes(child, match.attrs)) continue;
    if (match.predicate && !match.predicate(child)) continue;
    result.push(child);
  }

  return Object.freeze(result);
}

export function requireChild(
  node: ProtocolNode,
  match: ChildMatch,
): ProtocolNode {
  const child = findChild(node, match);

  if (!child) {
    throw new NodeSemanticsError(
      "NODE_NOT_FOUND",
      `Required child not found under <${node.tag}>.`,
    );
  }

  return child;
}

export function findPath(
  root: ProtocolNode,
  path: readonly NodePathSegment[],
): ProtocolNode | undefined {
  let current: ProtocolNode | undefined = root;

  for (const segment of path) {
    current = findChild(current, {
      tag: segment.tag,
      attrs: segment.attrs,
    });

    if (!current) return undefined;
  }

  return current;
}

export function walk(
  root: ProtocolNode,
  predicate: NodePredicate,
): readonly ProtocolNode[] {
  const found: ProtocolNode[] = [];

  const visit = (node: ProtocolNode): void => {
    if (predicate(node)) found.push(node);

    for (const child of node.content) {
      if (isProtocolNode(child)) visit(child);
    }
  };

  visit(root);
  return Object.freeze(found);
}

export function validateNode(
  node: ProtocolNode,
  options: {
    readonly tag?: string;
    readonly requiredAttributes?: readonly string[];
    readonly attributeRules?: Readonly<
      Record<string, (value: string) => boolean>
    >;
    readonly requiredChildren?: readonly ChildMatch[];
    readonly contentPredicate?: (
      content: readonly unknown[],
    ) => boolean;
  } = {},
): NodeValidationResult {
  const issues: NodeValidationIssue[] = [];

  if (options.tag && node.tag !== options.tag) {
    issues.push({
      code: "TAG_MISMATCH",
      path: "/",
      message: `Expected <${options.tag}>, received <${node.tag}>.`,
    });
  }

  for (const attribute of options.requiredAttributes ?? []) {
    if (node.attrs[attribute] === undefined) {
      issues.push({
        code: "MISSING_ATTRIBUTE",
        path: `/@${attribute}`,
        message: `Missing required attribute "${attribute}".`,
      });
    }
  }

  for (const [attribute, rule] of Object.entries(
    options.attributeRules ?? {},
  )) {
    const value = node.attrs[attribute];
    if (value !== undefined && !rule(value)) {
      issues.push({
        code: "INVALID_ATTRIBUTE",
        path: `/@${attribute}`,
        message: `Attribute "${attribute}" failed validation.`,
      });
    }
  }

  for (const required of options.requiredChildren ?? []) {
    if (!findChild(node, required)) {
      issues.push({
        code: "MISSING_CHILD",
        path: `/${required.tag ?? "*"}`,
        message: `Required child "${required.tag ?? "*"}" was not found.`,
      });
    }
  }

  if (
    options.contentPredicate &&
    !options.contentPredicate(node.content)
  ) {
    issues.push({
      code: "INVALID_CONTENT",
      path: "/content",
      message: "Node content failed validation.",
    });
  }

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
  });
}

function isProtocolNode(value: unknown): value is ProtocolNode {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ProtocolNode>;

  return (
    typeof candidate.tag === "string" &&
    !!candidate.attrs &&
    Array.isArray(candidate.content)
  );
}
