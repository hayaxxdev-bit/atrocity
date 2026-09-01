import type { ProtocolNode } from "../node/index.js";
import { SyncError } from "./sync-errors.js";
import { FeatureDiscovery } from "./feature-discovery.js";
import { ServerCapabilityMap } from "./server-capability-map.js";
import { CapabilityNegotiator } from "./capability-negotiator.js";
import type { FeatureRequirement, CapabilityNegotiationResult } from "./capability-negotiation-types.js";
import type {
  InitialSyncResult,
  ProtocolFeatureSet,
  SyncCheckpoint,
  SyncStage,
} from "./sync-types.js";

export type SyncBootstrapTransport = {
  readonly sendNode: (node: ProtocolNode) => Promise<void>;
  readonly waitForNode: (
    predicate: (node: ProtocolNode) => boolean,
    timeoutMs: number,
  ) => Promise<ProtocolNode>;
};

export type SyncBootstrapOptions = {
  readonly timeoutMs?: number;
  readonly featureRequirements?: readonly FeatureRequirement[];
  readonly buildBootstrapNode: (
    features: ProtocolFeatureSet,
  ) => ProtocolNode;
  readonly initialNodePredicate: (node: ProtocolNode) => boolean;
};

export class SyncBootstrap {
  readonly discovery = new FeatureDiscovery();
  readonly capabilityMap = new ServerCapabilityMap();
  readonly negotiator = new CapabilityNegotiator();

  private stageValue: SyncStage = "idle";
  private sequence = 0;
  private updatedAt = Date.now();

  constructor(
    private readonly transport: SyncBootstrapTransport,
    private readonly options: SyncBootstrapOptions,
  ) {}

  get stage(): SyncStage {
    return this.stageValue;
  }

  checkpoint(): SyncCheckpoint {
    return Object.freeze({
      stage: this.stageValue,
      updatedAt: this.updatedAt,
      sequence: this.sequence,
    });
  }

  async run(): Promise<InitialSyncResult> {
    this.transition("starting");

    try {
      this.transition("stream-ready");

      const featuresNode = await this.transport.waitForNode(
        (node) => node.tag === "stream:features",
        this.options.timeoutMs ?? 15_000,
      );

      const features = this.discovery.discover(featuresNode);
      const capabilities = this.capabilityMap.fromFeatureSet(features);
      const negotiation = this.negotiator.negotiate(
        capabilities,
        this.options.featureRequirements ?? [],
      );
      this.transition("features-discovered");

      const bootstrapNode = this.options.buildBootstrapNode(features);
      await this.transport.sendNode(bootstrapNode);
      this.transition("bootstrap-sent");

      const initialNode = await this.transport.waitForNode(
        this.options.initialNodePredicate,
        this.options.timeoutMs ?? 15_000,
      );

      this.transition("initial-state-received");
      this.transition("completed");

      return Object.freeze({
        features,
        capabilities,
        negotiation,
        checkpoint: this.checkpoint(),
        initialNodes: Object.freeze([initialNode]),
      });
    } catch (error) {
      this.stageValue = "failed";
      this.touch();

      if (error instanceof SyncError) {
        throw error;
      }

      throw new SyncError(
        "SYNC_BOOTSTRAP_FAILED",
        "Protocol bootstrap/sync failed.",
        { cause: error },
      );
    }
  }

  private transition(next: SyncStage): void {
    const allowed: Record<SyncStage, readonly SyncStage[]> = {
      idle: ["starting"],
      starting: ["stream-ready", "failed"],
      "stream-ready": ["features-discovered", "failed"],
      "features-discovered": ["bootstrap-sent", "failed"],
      "bootstrap-sent": ["initial-state-received", "failed"],
      "initial-state-received": ["completed", "failed"],
      completed: [],
      failed: [],
    };

    if (!allowed[this.stageValue].includes(next)) {
      throw new SyncError(
        "SYNC_INVALID_STATE",
        `Invalid sync transition ${this.stageValue} → ${next}.`,
      );
    }

    this.stageValue = next;
    this.touch();
  }

  private touch(): void {
    this.sequence += 1;
    this.updatedAt = Date.now();
  }
}
