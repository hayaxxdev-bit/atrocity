import { AtrocityClient } from "../client/index.js";
import { ConnectionDiagnostics, ConnectionManager, ConnectionProtocolAdapter } from "../connection/index.js";
import { AtrocityStateStore } from "../auth/index.js";
import { ProtocolRuntime } from "../protocol/index.js";
import { WhatsAppProtocolTransport } from "../transport/index.js";
import type { ConnectionDependencies } from "../connection/index.js";
import type { AtrocityClientOptions } from "../client/index.js";
import type { AtrocityRuntime } from "./atrocity-factory-types.js";

export type AtrocityCompositionOptions = {
  readonly stateDirectory: string;
  readonly transport: WhatsAppProtocolTransport;
  readonly sendProtocolNode: (
    node: import("../protocol/node/index.js").ProtocolNode,
    associatedData?: Uint8Array,
  ) => Promise<void>;
  readonly connectionDependencies: Omit<
    ConnectionDependencies,
    "transport" | "protocol" | "protocolLifecycle"
  > & {
    readonly handshake: ConnectionDependencies["handshake"];
    readonly authenticate: ConnectionDependencies["authenticate"];
    readonly sync?: ConnectionDependencies["sync"];
  };
};

export function createAtrocityRuntime(
  options: AtrocityCompositionOptions,
): AtrocityRuntime {
  const store = new AtrocityStateStore({
    directory: options.stateDirectory,
  });

  const protocol = new ProtocolRuntime({
    sendNode: options.sendProtocolNode,
  });

  const protocolLifecycle = new ConnectionProtocolAdapter({
    protocol,
  });

  const connectionDependencies: ConnectionDependencies = {
    ...options.connectionDependencies,
    transport: options.transport as never,
    protocol: {
      start: async () => {},
      stop: async () => {},
    },
    protocolLifecycle,
  };

  const connection = new ConnectionManager(connectionDependencies);
  const diagnostics = new ConnectionDiagnostics(
    connection.eventBus,
    connection,
  );

  const clientOptions: AtrocityClientOptions = {
    connection,
    diagnostics,
    protocol: {
      sendNode: async (node, associatedData) => {
        await protocol.sendNode(node, associatedData);
      },
      close: async () => {
        await connection.close();
      },
    },
  };

  const client = new AtrocityClient(clientOptions);

  return Object.freeze({
    client,
    connection,
    protocol,
    transport: options.transport,
    store,
  });
}
