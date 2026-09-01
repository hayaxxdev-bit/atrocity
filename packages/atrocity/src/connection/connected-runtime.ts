import type { ConnectionRuntime } from "./connection-types.js";
import type { ProtocolRuntime } from "../protocol/runtime/protocol-runtime.js";

/**
 * Small composition helper used by the application root.
 * It does not duplicate lifecycle ownership.
 */
export type ConnectedRuntime = {
  readonly connection: ConnectionRuntime;
  readonly protocol: ProtocolRuntime;
};
