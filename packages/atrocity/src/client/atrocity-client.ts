import type { ProtocolNode } from "../protocol/node/index.js";
import type {
  ConnectionDiagnostics,
  ConnectionEvent,
  ConnectionEventListener,
  ConnectionHealthSnapshot,
  ConnectionRuntime,
  ConnectionSnapshot,
} from "../connection/index.js";
import { AtrocityClientError } from "./atrocity-client-errors.js";
import { CapabilityRegistry } from "./capability-registry.js";
import { ATROCITY_PUBLIC_API_VERSION } from "./public-api-types.js";
import type {
  AtrocityClientCapabilities,
  AtrocityClientOptions,
  AtrocityClientSnapshot,
  AtrocityClientState,
} from "./atrocity-client-types.js";

export class AtrocityClient {
  private stateValue: AtrocityClientState = "created";
  private unsubscribe?: () => void;

  private readonly registry: CapabilityRegistry;
  readonly capabilities: AtrocityClientCapabilities;

  constructor(
    private readonly options: AtrocityClientOptions,
  ) {
    this.registry = new CapabilityRegistry({
      "protocol.nodes": {
        name: "protocol.nodes",
        version: 1,
        status:
          options.protocol?.sendNode !== undefined
            ? "available"
            : "unavailable",
        flags: [],
      },
      diagnostics: {
        name: "diagnostics",
        version: 1,
        status:
          options.diagnostics !== undefined
            ? "available"
            : "unavailable",
        flags: [],
      },
      reconnect: {
        name: "reconnect",
        version: 1,
        status:
          typeof (options.connection as ConnectionRuntime & {
            reconnect?: () => Promise<void>;
          }).reconnect === "function"
            ? "available"
            : "unavailable",
        flags: [],
      },
    });

    this.capabilities = this.registry.snapshot();

    this.subscribeToConnectionEvents();
  }

  get state(): AtrocityClientState {
    return this.stateValue;
  }

  async connect(): Promise<void> {
    this.ensureNotClosed();

    this.stateValue = "connecting";

    try {
      await this.options.connection.connect();
      this.stateValue = "ready";
    } catch (error) {
      this.stateValue = "failed";

      if (error instanceof AtrocityClientError) {
        throw error;
      }

      throw new AtrocityClientError(
        "CLIENT_OPERATION_FAILED",
        "AtrocityClient failed to connect.",
        { cause: error },
      );
    }
  }

  async reconnect(): Promise<void> {
    this.ensureNotClosed();

    if (!this.registry.has("reconnect")) {
      throw new AtrocityClientError(
        "CLIENT_CAPABILITY_UNAVAILABLE",
        "Reconnect capability is unavailable.",
      );
    }

    const reconnect = (
      this.options.connection as ConnectionRuntime & {
        reconnect?: () => Promise<void>;
      }
    ).reconnect;

    if (!reconnect) {
      throw new AtrocityClientError(
        "CLIENT_OPERATION_FAILED",
        "The configured connection runtime does not expose reconnect().",
      );
    }

    this.stateValue = "reconnecting";

    try {
      await reconnect();
      this.stateValue = "ready";
    } catch (error) {
      this.stateValue = "failed";
      throw new AtrocityClientError(
        "CLIENT_OPERATION_FAILED",
        "AtrocityClient failed to reconnect.",
        { cause: error },
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.stateValue === "closed") return;

    this.stateValue = "closing";

    try {
      await this.options.protocol?.close?.();
      await this.options.connection.close();
      this.stateValue = "closed";
    } catch (error) {
      this.stateValue = "failed";
      throw new AtrocityClientError(
        "CLIENT_OPERATION_FAILED",
        "AtrocityClient failed to disconnect.",
        { cause: error },
      );
    }
  }

  async sendNode(
    node: ProtocolNode,
    associatedData?: Uint8Array,
  ): Promise<void> {
    if (this.stateValue !== "ready") {
      throw new AtrocityClientError(
        "CLIENT_INVALID_STATE",
        `Cannot send while client is ${this.stateValue}.`,
      );
    }

    if (!this.registry.has("protocol.nodes")) {
      throw new AtrocityClientError(
        "CLIENT_CAPABILITY_UNAVAILABLE",
        "Protocol node sending capability is unavailable.",
      );
    }

    const sendNode = this.options.protocol?.sendNode;

    if (!sendNode) {
      throw new AtrocityClientError(
        "CLIENT_PROTOCOL_UNAVAILABLE",
        "Protocol node sending is not configured.",
      );
    }

    try {
      await sendNode(node, associatedData);
    } catch (error) {
      throw new AtrocityClientError(
        "CLIENT_OPERATION_FAILED",
        "Failed to send protocol node.",
        { cause: error },
      );
    }
  }

  snapshot(): AtrocityClientSnapshot {
    const connection = this.options.connection.snapshot();
    const diagnostics = this.options.diagnostics;

    return Object.freeze({
      apiVersion: ATROCITY_PUBLIC_API_VERSION,
      state: this.stateValue,
      capabilities: this.capabilities,
      connection,
      ...(diagnostics
        ? { health: diagnostics.health.snapshot() }
        : {}),
    });
  }

  onConnectionEvent(
    listener: ConnectionEventListener,
  ): () => void {
    const connection = this.options.connection;
    const events = (
      connection as ConnectionRuntime & {
        eventBus?: {
          subscribe(listener: ConnectionEventListener): () => void;
        };
      }
    ).eventBus;

    if (!events) {
      throw new AtrocityClientError(
        "CLIENT_NOT_CONFIGURED",
        "Connection runtime does not expose an event bus.",
      );
    }

    return events.subscribe(listener);
  }

  diagnostics(): ReturnType<
    NonNullable<AtrocityClientOptions["diagnostics"]>["report"]
  > {
    if (!this.registry.has("diagnostics")) {
      throw new AtrocityClientError(
        "CLIENT_CAPABILITY_UNAVAILABLE",
        "Diagnostics capability is unavailable.",
      );
    }

    const diagnostics = this.options.diagnostics;

    if (!diagnostics) {
      throw new AtrocityClientError(
        "CLIENT_NOT_CONFIGURED",
        "Diagnostics are not configured.",
      );
    }

    return diagnostics.report();
  }

  private subscribeToConnectionEvents(): void {
    const connection = this.options.connection;
    const events = (
      connection as ConnectionRuntime & {
        eventBus?: {
          subscribe(listener: ConnectionEventListener): () => void;
        };
      }
    ).eventBus;

    if (!events) return;

    this.unsubscribe = events.subscribe(
      (event: ConnectionEvent) => {
        this.handleConnectionEvent(event);
      },
    );
  }

  private handleConnectionEvent(event: ConnectionEvent): void {
    switch (event.type) {
      case "connection.connecting":
        this.stateValue = "connecting";
        break;
      case "connection.reconnecting":
        this.stateValue = "reconnecting";
        break;
      case "connection.ready":
        this.stateValue = "ready";
        break;
      case "connection.failed":
        this.stateValue = "failed";
        break;
      case "connection.closing":
        this.stateValue = "closing";
        break;
      case "connection.closed":
        this.stateValue = "closed";
        break;
      default:
        break;
    }
  }

  private ensureNotClosed(): void {
    if (this.stateValue === "closed") {
      throw new AtrocityClientError(
        "CLIENT_INVALID_STATE",
        "AtrocityClient is closed and cannot be reused.",
      );
    }
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
