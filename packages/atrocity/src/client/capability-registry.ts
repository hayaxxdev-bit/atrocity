import type {
  Capability,
  CapabilityName,
  ClientCapabilityMap,
} from "./public-api-types.js";

export const DEFAULT_CAPABILITIES: ClientCapabilityMap = Object.freeze({
  connection: capability("connection", 1, "available", []),
  "protocol.nodes": capability("protocol.nodes", 1, "available", []),
  diagnostics: capability("diagnostics", 1, "unavailable", []),
  reconnect: capability("reconnect", 1, "unavailable", []),
  media: capability("media", 1, "unavailable", ["not-implemented"]),
  groups: capability("groups", 1, "unavailable", ["not-implemented"]),
  "history-sync": capability(
    "history-sync",
    1,
    "unavailable",
    ["not-implemented"],
  ),
});

export class CapabilityRegistry {
  private readonly values: ClientCapabilityMap;

  constructor(
    overrides: Partial<ClientCapabilityMap> = {},
  ) {
    this.values = Object.freeze({
      ...DEFAULT_CAPABILITIES,
      ...overrides,
    });
  }

  get(name: CapabilityName): Capability {
    return this.values[name];
  }

  has(name: CapabilityName): boolean {
    return this.values[name].status === "available";
  }

  snapshot(): ClientCapabilityMap {
    return Object.freeze({
      ...this.values,
    });
  }
}

function capability(
  name: CapabilityName,
  version: number,
  status: Capability["status"],
  flags: readonly string[],
): Capability {
  return Object.freeze({
    name,
    version,
    status,
    flags: Object.freeze([...flags]),
  });
}
