import type { ProtocolNode } from "../node/index.js";

export type ProtocolHandlerContext = {
  readonly receivedAt: number;
  readonly connectionId?: string;
};

export type ProtocolHandler = (
  node: ProtocolNode,
  context: ProtocolHandlerContext,
) => void | Promise<void>;

export type ProtocolRoute = {
  readonly name: string;
  readonly tag?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly handler: ProtocolHandler;
  readonly priority?: number;
};

export type ProtocolDispatchResult = {
  readonly handled: boolean;
  readonly routeNames: readonly string[];
};
