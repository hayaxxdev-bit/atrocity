import type { ProtocolNode } from "../node/index.js";
import type { ProtocolRuntime } from "../runtime/index.js";
import type { FeatureRequirement } from "../sync/capability-negotiation-types.js";
import { FeatureDiscovery } from "../sync/feature-discovery.js";
import { ServerCapabilityMap } from "../sync/server-capability-map.js";
import { CapabilityNegotiator } from "../sync/capability-negotiator.js";
import {
  StreamRuntimeError,
} from "./stream-runtime-errors.js";
import type {
  StreamRuntimeResult,
  StreamRuntimeState,
} from "./stream-runtime-types.js";

export type StreamNodeTransport = {
  readonly sendNode: (node: ProtocolNode) => Promise<void>;
  readonly receiveNode: (
    predicate: (node: ProtocolNode) => boolean,
    timeoutMs: number,
  ) => Promise<ProtocolNode>;
};

export type StreamRuntimeOptions = {
  readonly featureRequirements?: readonly FeatureRequirement[];
  readonly featureTimeoutMs?: number;
  readonly buildStreamOpenNode: () => ProtocolNode;
};

export class StreamRuntime {
  private stateValue: StreamRuntimeState = "created";

  readonly discovery = new FeatureDiscovery();
  readonly capabilityMap = new ServerCapabilityMap();
  readonly negotiator = new CapabilityNegotiator();

  constructor(
    private readonly transport: StreamNodeTransport,
    private readonly protocol: ProtocolRuntime,
    private readonly options: StreamRuntimeOptions,
  ) {}

  get state(): StreamRuntimeState {
    return this.stateValue;
  }

  markAuthenticated(): void {
    if (this.stateValue !== "created") {
      throw new StreamRuntimeError(
        "STREAM_RUNTIME_INVALID_STATE",
        `Cannot authenticate stream from state ${this.stateValue}.`,
      );
    }

    this.stateValue = "authenticated";
  }

  async open(): Promise<StreamRuntimeResult> {
    if (this.stateValue !== "authenticated") {
      throw new StreamRuntimeError(
        "STREAM_RUNTIME_INVALID_STATE",
        `Stream must be authenticated before opening; current state is ${this.stateValue}.`,
      );
    }

    this.stateValue = "opening";

    try {
      await this.transport.sendNode(
        this.options.buildStreamOpenNode(),
      );

      const featuresNode =
        await this.transport.receiveNode(
          (node) => node.tag === "stream:features",
          this.options.featureTimeoutMs ?? 15_000,
        );

      this.stateValue = "features-received";

      const features =
        this.discovery.discover(featuresNode);

      const capabilities =
        this.capabilityMap.fromFeatureSet(features);

      const negotiation =
        this.negotiator.negotiate(
          capabilities,
          this.options.featureRequirements ?? [],
        );

      this.stateValue = "capabilities-negotiated";

      await this.protocol.start();
      this.stateValue = "protocol-started";

      const snapshot = this.protocol.snapshot();

      this.stateValue = "ready";

      return Object.freeze({
        state: "ready",
        featuresNode,
        capabilities,
        negotiation,
        protocol: snapshot,
      });
    } catch (error) {
      this.stateValue = "failed";

      if (error instanceof StreamRuntimeError) {
        throw error;
      }

      throw new StreamRuntimeError(
        "STREAM_RUNTIME_OPEN_FAILED",
        "Failed to open authenticated protocol stream.",
        { cause: error },
      );
    }
  }

  async close(): Promise<void> {
    if (
      this.stateValue === "closed" ||
      this.stateValue === "created"
    ) {
      this.stateValue = "closed";
      return;
    }

    if (
      this.stateValue !== "ready" &&
      this.stateValue !== "failed"
    ) {
      throw new StreamRuntimeError(
        "STREAM_RUNTIME_INVALID_STATE",
        `Cannot close stream from state ${this.stateValue}.`,
      );
    }

    this.stateValue = "closing";

    try {
      await this.protocol.stop();
      this.stateValue = "closed";
    } catch (error) {
      this.stateValue = "failed";

      throw new StreamRuntimeError(
        "STREAM_RUNTIME_PROTOCOL_FAILED",
        "Failed to stop protocol runtime during stream close.",
        { cause: error },
      );
    }
  }
}
