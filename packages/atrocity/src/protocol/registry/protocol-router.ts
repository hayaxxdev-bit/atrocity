import type { ProtocolNode } from "../node/index.js";
import {
  ProtocolRegistry,
  type ProtocolDispatchResult,
  type ProtocolHandler,
  type ProtocolHandlerContext,
} from "./index.js";

export class ProtocolRouter {
  constructor(
    private readonly registry: ProtocolRegistry,
  ) {}

  register(
    name: string,
    handler: ProtocolHandler,
    options: {
      readonly tag?: string;
      readonly attributes?: Readonly<Record<string, string>>;
      readonly priority?: number;
    } = {},
  ): () => void {
    return this.registry.register({
      name,
      handler,
      ...options,
    });
  }

  dispatch(
    node: ProtocolNode,
    context: ProtocolHandlerContext,
  ): Promise<ProtocolDispatchResult> {
    return this.registry.dispatch(node, context);
  }
}
