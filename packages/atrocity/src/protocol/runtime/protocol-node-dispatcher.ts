import type { ProtocolNode } from "../node/index.js";
import type { ProtocolRegistry } from "../registry/index.js";
import type { ProtocolHandlerContext } from "../registry/index.js";
import type { IqCorrelator } from "../iq/index.js";
import type { ProtocolEventBus } from "../events/index.js";
import { ProtocolRuntimeError } from "./protocol-runtime-errors.js";

export type ProtocolNodeDispatchResult = {
  readonly correlatedIq: boolean;
  readonly handled: boolean;
  readonly routeNames: readonly string[];
  readonly receivedAt: number;
};

export type ProtocolNodeDispatcherDependencies = {
  readonly iq: IqCorrelator;
  readonly registry: ProtocolRegistry;
  readonly events: ProtocolEventBus;
  readonly connectionId?: string;
};

export class ProtocolNodeDispatcher {
  constructor(
    private readonly dependencies: ProtocolNodeDispatcherDependencies,
  ) {}

  async dispatch(
    node: ProtocolNode,
    receivedAt = Date.now(),
  ): Promise<ProtocolNodeDispatchResult> {
    const correlatedIq = this.dependencies.iq.resolve(node);

    await this.dependencies.events.emit("protocol.node", {
      node,
      receivedAt,
    });

    let result;

    try {
      result = await this.dependencies.registry.dispatch(
        node,
        {
          receivedAt,
          ...(this.dependencies.connectionId
            ? { connectionId: this.dependencies.connectionId }
            : {}),
        },
      );
    } catch (error) {
      throw new ProtocolRuntimeError(
        "PROTOCOL_RUNTIME_DISPATCH_FAILED",
        `Failed to dispatch protocol node <${node.tag}>.`,
        { cause: error },
      );
    }

    if (!result.handled && node.tag === "iq" && correlatedIq) {
      return Object.freeze({
        correlatedIq,
        handled: false,
        routeNames: Object.freeze([]),
        receivedAt,
      });
    }

    return Object.freeze({
      correlatedIq,
      handled: result.handled,
      routeNames: result.routeNames,
      receivedAt,
    });
  }
}
