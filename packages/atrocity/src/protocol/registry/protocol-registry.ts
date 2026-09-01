import type { ProtocolNode } from "../node/index.js";
import {
  hasAttributes,
} from "../semantics/index.js";
import { ProtocolRegistryError } from "./protocol-registry-errors.js";
import type {
  ProtocolDispatchResult,
  ProtocolHandlerContext,
  ProtocolRoute,
} from "./protocol-registry-types.js";

export class ProtocolRegistry {
  private readonly routes: ProtocolRoute[] = [];
  private readonly names = new Set<string>();

  register(route: ProtocolRoute): () => void {
    validateRoute(route);

    if (this.names.has(route.name)) {
      throw new ProtocolRegistryError(
        "PROTOCOL_ROUTE_DUPLICATE",
        `Protocol route "${route.name}" is already registered.`,
      );
    }

    this.names.add(route.name);
    this.routes.push(Object.freeze({
      ...route,
      priority: route.priority ?? 0,
    }));
    this.routes.sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );

    return () => this.unregister(route.name);
  }

  unregister(name: string): boolean {
    const index = this.routes.findIndex(
      (route) => route.name === name,
    );

    if (index < 0) return false;

    this.routes.splice(index, 1);
    this.names.delete(name);
    return true;
  }

  list(): readonly ProtocolRoute[] {
    return Object.freeze([...this.routes]);
  }

  async dispatch(
    node: ProtocolNode,
    context: ProtocolHandlerContext,
  ): Promise<ProtocolDispatchResult> {
    const matched = this.routes.filter(
      (route) => matches(route, node),
    );

    const handled: string[] = [];

    try {
      for (const route of matched) {
        await route.handler(node, context);
        handled.push(route.name);
      }

      return Object.freeze({
        handled: handled.length > 0,
        routeNames: Object.freeze(handled),
      });
    } catch (error) {
      throw new ProtocolRegistryError(
        "PROTOCOL_DISPATCH_FAILED",
        `Protocol dispatch failed for <${node.tag}>.`,
        { cause: error },
      );
    }
  }
}

function matches(
  route: ProtocolRoute,
  node: ProtocolNode,
): boolean {
  if (route.tag && route.tag !== node.tag) return false;
  if (
    route.attributes &&
    !hasAttributes(node, route.attributes)
  ) {
    return false;
  }
  return true;
}

function validateRoute(route: ProtocolRoute): void {
  if (
    !route.name ||
    typeof route.name !== "string"
  ) {
    throw new ProtocolRegistryError(
      "PROTOCOL_ROUTE_INVALID",
      "Protocol route name must be non-empty.",
    );
  }

  if (typeof route.handler !== "function") {
    throw new ProtocolRegistryError(
      "PROTOCOL_ROUTE_INVALID",
      `Protocol route "${route.name}" requires a handler.`,
    );
  }

  if (
    route.priority !== undefined &&
    !Number.isSafeInteger(route.priority)
  ) {
    throw new ProtocolRegistryError(
      "PROTOCOL_ROUTE_INVALID",
      `Protocol route "${route.name}" has invalid priority.`,
    );
  }
}
