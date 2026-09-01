import type { AtrocityClient } from "../client/index.js";
import type { ConnectionManager } from "../connection/index.js";
import type { ProtocolRuntime } from "../protocol/index.js";
import type { AtrocityStateStore } from "../auth/index.js";
import type { WhatsAppProtocolTransport } from "../transport/index.js";

export type AtrocityRuntime = {
  readonly client: AtrocityClient;
  readonly connection: ConnectionManager;
  readonly protocol: ProtocolRuntime;
  readonly transport: WhatsAppProtocolTransport;
  readonly store: AtrocityStateStore;
};
