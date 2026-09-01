import type { ProtocolNode } from "../node/index.js";
import type {
  ProtocolDispatchResult,
  ProtocolHandlerContext,
  ProtocolRoute,
} from "../registry/index.js";

export type ProtocolRuntimeState =
  | "created"
  | "starting"
  | "started"
  | "stopping"
  | "stopped"
  | "failed";

export type ProtocolRuntimeOptions = {
  readonly connectionId?: string;
  readonly maxInboundNodeBytes?: number;
};

export type ProtocolRuntimeSnapshot = {
  readonly state: ProtocolRuntimeState;
  readonly connectionId?: string;
  readonly pendingIqRequests: number;
  readonly registeredRoutes: number;
  readonly startedFeatures: readonly string[];
};

export type ProtocolRuntimeComponents = {
  readonly sendNode: (
    node: ProtocolNode,
    associatedData?: Uint8Array,
  ) => Promise<void>;
  readonly registerRoute: (
    route: ProtocolRoute,
  ) => () => void;
  readonly dispatch: (
    node: ProtocolNode,
    context: ProtocolHandlerContext,
  ) => Promise<ProtocolDispatchResult>;
};
