export type AtrocityClientState =
  | "created"
  | "connecting"
  | "ready"
  | "reconnecting"
  | "closing"
  | "closed"
  | "failed";

export type AtrocityClientOptions = {
  readonly connection: import("../connection/index.js").ConnectionRuntime;
  readonly diagnostics?: import("../connection/index.js").ConnectionDiagnostics;
  readonly protocol?: {
    readonly sendNode?: (
      node: import("../protocol/node/index.js").ProtocolNode,
      associatedData?: Uint8Array,
    ) => Promise<void>;
    readonly close?: () => Promise<void>;
  };
};

import type { ClientCapabilityMap } from "./public-api-types.js";

export type AtrocityClientCapabilities = ClientCapabilityMap;

export type AtrocityClientSnapshot = {
  readonly state: AtrocityClientState;
  readonly capabilities: AtrocityClientCapabilities;
  readonly connection: import("../connection/index.js").ConnectionSnapshot;
  readonly health?: import("../connection/index.js").ConnectionHealthSnapshot;
};

export type AtrocityClientEventName =
  import("../connection/index.js").ConnectionEventType;
