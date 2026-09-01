import type { ProtocolNode } from "../node/index.js";
import {
  ProtocolFeatureManager,
  type ProtocolFeature,
} from "../features/index.js";
import {
  ProtocolRegistry,
  type ProtocolRoute,
} from "../registry/index.js";
import {
  IqClient,
  IqCorrelator,
  type IqCorrelationTransport,
} from "../iq/index.js";
import { ProtocolRuntimeError } from "./protocol-runtime-errors.js";
import { ProtocolEventBus } from "../events/index.js";
import { ProtocolNodeDispatcher } from "./protocol-node-dispatcher.js";
import type {
  ProtocolRuntimeOptions,
  ProtocolRuntimeSnapshot,
} from "./protocol-runtime-types.js";

export type ProtocolRuntimeDependencies = {
  readonly sendNode: (
    node: ProtocolNode,
    associatedData?: Uint8Array,
  ) => Promise<void>;

  readonly connectionId?: string;
  readonly iqDefaultTimeoutMs?: number;
};

export class ProtocolRuntime {
  readonly registry = new ProtocolRegistry();
  readonly features = new ProtocolFeatureManager();

  private readonly sendRawNode: (
    node: ProtocolNode,
    associatedData?: Uint8Array,
  ) => Promise<void>;
  readonly iq: IqClient;
  readonly events = new ProtocolEventBus();
  readonly dispatcher: ProtocolNodeDispatcher;

  private stateValue: ProtocolRuntimeSnapshot["state"] = "created";
  private readonly maxInboundNodeBytes: number;
  private readonly connectionId?: string;

  constructor(
    dependencies: ProtocolRuntimeDependencies,
    options: ProtocolRuntimeOptions = {},
  ) {
    this.connectionId =
      options.connectionId ?? dependencies.connectionId;
    this.maxInboundNodeBytes =
      options.maxInboundNodeBytes ?? 16 * 1024 * 1024;

    if (
      !Number.isSafeInteger(this.maxInboundNodeBytes) ||
      this.maxInboundNodeBytes <= 0
    ) {
      throw new RangeError(
        "maxInboundNodeBytes must be a positive safe integer.",
      );
    }

    this.sendRawNode = dependencies.sendNode;
    this.iqTransport = Object.freeze({
      sendIq: async (node: ProtocolNode) => {
        await dependencies.sendNode(node);
      },
    });

    this.iq = new IqClient(
      this.iqTransport,
      dependencies.iqDefaultTimeoutMs ?? 15_000,
    );

    this.dispatcher = new ProtocolNodeDispatcher({
      iq: this.iq.correlator,
      registry: this.registry,
      events: this.events,
      ...(this.connectionId
        ? { connectionId: this.connectionId }
        : {}),
    });
  }

  get state(): ProtocolRuntimeSnapshot["state"] {
    return this.stateValue;
  }

  registerFeature(feature: ProtocolFeature): () => void {
    return this.features.register(feature);
  }

  registerRoute(route: ProtocolRoute): () => void {
    return this.registry.register(route);
  }

  async start(): Promise<void> {
    if (
      this.stateValue !== "created" &&
      this.stateValue !== "stopped"
    ) {
      throw new ProtocolRuntimeError(
        "PROTOCOL_RUNTIME_INVALID_STATE",
        `Cannot start protocol runtime from ${this.stateValue}.`,
      );
    }

    this.stateValue = "starting";

    try {
      await this.features.startAll();
      this.stateValue = "started";
    } catch (error) {
      this.stateValue = "failed";
      throw new ProtocolRuntimeError(
        "PROTOCOL_RUNTIME_START_FAILED",
        "Failed to start protocol runtime.",
        { cause: error },
      );
    }
  }

  async stop(): Promise<void> {
    if (
      this.stateValue === "stopped" ||
      this.stateValue === "created"
    ) {
      this.stateValue = "stopped";
      return;
    }

    if (this.stateValue !== "stopping") {
      if (
        this.stateValue !== "started" &&
        this.stateValue !== "failed"
      ) {
        throw new ProtocolRuntimeError(
          "PROTOCOL_RUNTIME_INVALID_STATE",
          `Cannot stop protocol runtime from ${this.stateValue}.`,
        );
      }
      this.stateValue = "stopping";
    }

    try {
      this.iq.close();
      await this.features.stopAll();
      this.stateValue = "stopped";
    } catch (error) {
      this.stateValue = "failed";
      throw new ProtocolRuntimeError(
        "PROTOCOL_RUNTIME_STOP_FAILED",
        "Failed to stop protocol runtime.",
        { cause: error },
      );
    }
  }

  async sendNode(
    node: ProtocolNode,
    associatedData?: Uint8Array,
  ): Promise<void> {
    if (this.stateValue !== "started") {
      throw new ProtocolRuntimeError(
        "PROTOCOL_RUNTIME_INVALID_STATE",
        `Cannot send a node while protocol runtime is ${this.stateValue}.`,
      );
    }

    if (
      !node ||
      !Array.isArray(node.content) ||
      typeof node.tag !== "string"
    ) {
      throw new ProtocolRuntimeError(
        "PROTOCOL_RUNTIME_INVALID_STATE",
        "Invalid protocol node.",
      );
    }

    await this.sendRawNode(node, associatedData);
  }

  async receiveNode(
    node: ProtocolNode,
  ): Promise<void> {
    if (this.stateValue !== "started") {
      throw new ProtocolRuntimeError(
        "PROTOCOL_RUNTIME_INVALID_STATE",
        `Cannot receive a node while protocol runtime is ${this.stateValue}.`,
      );
    }

    const estimatedSize = JSON.stringify(node).length;

    if (estimatedSize > this.maxInboundNodeBytes) {
      throw new ProtocolRuntimeError(
        "PROTOCOL_RUNTIME_NODE_TOO_LARGE",
        "Inbound protocol node exceeds configured size limit.",
      );
    }

    await this.dispatcher.dispatch(node);
  }

  snapshot(): ProtocolRuntimeSnapshot {
    return Object.freeze({
      state: this.stateValue,
      ...(this.connectionId
        ? { connectionId: this.connectionId }
        : {}),
      pendingIqRequests: this.iq.correlator.pendingCount,
      registeredRoutes: this.registry.list().length,
      startedFeatures: Object.freeze(
        this.features
          .list()
          .filter((entry) => entry.state === "started")
          .map((entry) => entry.name),
      ),
    });
  }
}
