export const ATROCITY_PUBLIC_API_VERSION = 1 as const;

export type CapabilityStatus =
  | "available"
  | "unavailable"
  | "experimental";

export type CapabilityName =
  | "connection"
  | "protocol.nodes"
  | "diagnostics"
  | "reconnect"
  | "media"
  | "groups"
  | "history-sync";

export type Capability = {
  readonly name: CapabilityName;
  readonly version: number;
  readonly status: CapabilityStatus;
  readonly flags: readonly string[];
};

export type ClientCapabilityMap = Readonly<
  Record<CapabilityName, Capability>
>;

export type AtrocityPublicErrorCode =
  | "CLIENT_INVALID_STATE"
  | "CLIENT_NOT_CONFIGURED"
  | "CLIENT_PROTOCOL_UNAVAILABLE"
  | "CLIENT_CAPABILITY_UNAVAILABLE"
  | "CLIENT_OPERATION_FAILED";

export type AtrocityPublicSnapshot = {
  readonly apiVersion: typeof ATROCITY_PUBLIC_API_VERSION;
  readonly state: import("./atrocity-client-types.js").AtrocityClientState;
  readonly capabilities: ClientCapabilityMap;
  readonly connection: import("../connection/index.js").ConnectionSnapshot;
  readonly health?: import("../connection/index.js").ConnectionHealthSnapshot;
};
