import { ProtocolFeatureError } from "./protocol-feature-errors.js";
import type { ServerCapabilitySet } from "../sync/server-capability-types.js";

import type {
  ProtocolFeature,
  ProtocolFeatureContext,
  ProtocolFeatureSnapshot,
  ProtocolFeatureState,
} from "./protocol-feature-types.js";

type Entry = {
  readonly feature: ProtocolFeature;
  state: ProtocolFeatureState;
};

export class ProtocolFeatureManager {
  private readonly entries = new Map<string, Entry>();

  register(feature: ProtocolFeature): () => void {
    validateFeature(feature);

    if (this.entries.has(feature.name)) {
      throw new ProtocolFeatureError(
        "FEATURE_DUPLICATE",
        `Protocol feature "${feature.name}" is already registered.`,
      );
    }

    this.entries.set(feature.name, {
      feature: Object.freeze({
        ...feature,
        dependencies: Object.freeze([
          ...(feature.dependencies ?? []),
        ]),
        capabilities: Object.freeze([
          ...(feature.capabilities ?? []),
        ]),
      }),
      state: "registered",
    });

    return () => {
      this.unregister(feature.name);
    };
  }

  unregister(name: string): boolean {
    const entry = this.entries.get(name);
    if (!entry) return false;

    if (
      entry.state === "started" ||
      entry.state === "starting" ||
      entry.state === "stopping"
    ) {
      throw new ProtocolFeatureError(
        "FEATURE_INVALID",
        `Cannot unregister active feature "${name}".`,
      );
    }

    this.entries.delete(name);
    return true;
  }

  get(name: string): ProtocolFeatureSnapshot {
    const entry = this.entries.get(name);

    if (!entry) {
      throw new ProtocolFeatureError(
        "FEATURE_NOT_FOUND",
        `Protocol feature "${name}" is not registered.`,
      );
    }

    return snapshot(entry);
  }

  list(): readonly ProtocolFeatureSnapshot[] {
    return Object.freeze(
      [...this.entries.values()].map(snapshot),
    );
  }

  async start(
    name: string,
    capabilities?: ServerCapabilitySet,
  ): Promise<void> {
    const order = this.resolveStartOrder(name);
    const started: Entry[] = [];

    try {
      for (const entry of order) {
        if (entry.state === "started") continue;

        entry.state = "starting";

        try {
          validateServerCapabilities(entry.feature, capabilities);
          validateServerCapabilities(entry.feature, capabilities);
          await entry.feature.start(
            contextFor(entry.feature),
          );
          entry.state = "started";
          started.push(entry);
        } catch (error) {
          entry.state = "failed";

          throw new ProtocolFeatureError(
            "FEATURE_START_FAILED",
            `Failed to start protocol feature "${entry.feature.name}".`,
            { cause: error },
          );
        }
      }
    } catch (error) {
      for (const entry of [...started].reverse()) {
        try {
          entry.state = "stopping";
          await entry.feature.stop(
            contextFor(entry.feature),
          );
          entry.state = "stopped";
        } catch {
          entry.state = "failed";
        }
      }

      throw error;
    }
  }

  async startAll(
    capabilities?: ServerCapabilitySet,
  ): Promise<void> {
    const order = this.resolveStartOrder();

    const started: Entry[] = [];

    try {
      for (const entry of order) {
        if (entry.state === "started") continue;

        entry.state = "starting";

        try {
          await entry.feature.start(
            contextFor(entry.feature),
          );
          entry.state = "started";
          started.push(entry);
        } catch (error) {
          entry.state = "failed";

          throw new ProtocolFeatureError(
            "FEATURE_START_FAILED",
            `Failed to start protocol feature "${entry.feature.name}".`,
            { cause: error },
          );
        }
      }
    } catch (error) {
      await this.rollbackStarted(started);
      throw error;
    }
  }

  async stop(name: string): Promise<void> {
    const order = this.resolveStartOrder(name).reverse();

    for (const entry of order) {
      if (entry.state !== "started") continue;

      entry.state = "stopping";

      try {
        await entry.feature.stop(
          contextFor(entry.feature),
        );
        entry.state = "stopped";
      } catch (error) {
        entry.state = "failed";

        throw new ProtocolFeatureError(
          "FEATURE_STOP_FAILED",
          `Failed to stop protocol feature "${entry.feature.name}".`,
          { cause: error },
        );
      }
    }
  }

  async stopAll(): Promise<void> {
    const order = this.resolveStartOrder().reverse();

    let firstError: unknown;

    for (const entry of order) {
      if (entry.state !== "started") continue;

      entry.state = "stopping";

      try {
        await entry.feature.stop(
          contextFor(entry.feature),
        );
        entry.state = "stopped";
      } catch (error) {
        entry.state = "failed";
        firstError ??= new ProtocolFeatureError(
          "FEATURE_STOP_FAILED",
          `Failed to stop protocol feature "${entry.feature.name}".`,
          { cause: error },
        );
      }
    }

    if (firstError) throw firstError;
  }

  private resolveStartOrder(
    targetName?: string,
  ): Entry[] {
    const selected = targetName
      ? collectDependencies(
          targetName,
          this.entries,
        )
      : new Set(this.entries.keys());

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const order: Entry[] = [];

    const visit = (name: string): void => {
      if (!selected.has(name)) return;
      if (visited.has(name)) return;

      if (visiting.has(name)) {
        throw new ProtocolFeatureError(
          "FEATURE_DEPENDENCY_CYCLE",
          `Dependency cycle detected at feature "${name}".`,
        );
      }

      const entry = this.entries.get(name);

      if (!entry) {
        throw new ProtocolFeatureError(
          "FEATURE_DEPENDENCY_MISSING",
          `Required protocol feature "${name}" is not registered.`,
        );
      }

      visiting.add(name);

      for (const dependency of entry.feature.dependencies ?? []) {
        if (!this.entries.has(dependency)) {
          throw new ProtocolFeatureError(
            "FEATURE_DEPENDENCY_MISSING",
            `Feature "${name}" requires "${dependency}", which is not registered.`,
          );
        }

        visit(dependency);
      }

      visiting.delete(name);
      visited.add(name);
      order.push(entry);
    };

    for (const name of selected) {
      visit(name);
    }

    return order;
  }

  private async rollbackStarted(
    started: readonly Entry[],
  ): Promise<void> {
    for (const entry of [...started].reverse()) {
      try {
        entry.state = "stopping";
        await entry.feature.stop(
          contextFor(entry.feature),
        );
        entry.state = "stopped";
      } catch {
        entry.state = "failed";
      }
    }
  }
}

function validateServerCapabilities(
  feature: ProtocolFeature,
  capabilities: ServerCapabilitySet | undefined,
): void {
  const required = feature.requiredServerCapabilities ?? [];
  if (required.length === 0) return;

  if (!capabilities) {
    throw new ProtocolFeatureError(
      "FEATURE_DEPENDENCY_MISSING",
      `Feature "${feature.name}" requires server capabilities, but no capability set was supplied.`,
    );
  }

  const missing = required.filter(
    (name) => !capabilities[name]?.supported,
  );

  if (missing.length > 0) {
    throw new ProtocolFeatureError(
      "FEATURE_DEPENDENCY_MISSING",
      `Feature "${feature.name}" requires unsupported server capabilities: ${missing.join(", ")}.`,
    );
  }
}

function collectDependencies(
  target: string,
  entries: Map<string, Entry>,
): Set<string> {
  const selected = new Set<string>();

  const collect = (name: string): void => {
    if (selected.has(name)) return;

    const entry = entries.get(name);
    if (!entry) {
      throw new ProtocolFeatureError(
        "FEATURE_NOT_FOUND",
        `Protocol feature "${name}" is not registered.`,
      );
    }

    selected.add(name);

    for (const dependency of entry.feature.dependencies ?? []) {
      collect(dependency);
    }
  };

  collect(target);
  return selected;
}

function validateFeature(feature: ProtocolFeature): void {
  if (
    !feature.name ||
    !Number.isSafeInteger(feature.version) ||
    feature.version <= 0
  ) {
    throw new ProtocolFeatureError(
      "FEATURE_INVALID",
      "Protocol feature requires a non-empty name and positive version.",
    );
  }

  if (typeof feature.start !== "function") {
    throw new ProtocolFeatureError(
      "FEATURE_INVALID",
      `Protocol feature "${feature.name}" requires start().`,
    );
  }

  if (typeof feature.stop !== "function") {
    throw new ProtocolFeatureError(
      "FEATURE_INVALID",
      `Protocol feature "${feature.name}" requires stop().`,
    );
  }
}

function contextFor(feature: ProtocolFeature): ProtocolFeatureContext {
  return Object.freeze({
    featureName: feature.name,
  });
}

function snapshot(entry: Entry): ProtocolFeatureSnapshot {
  return Object.freeze({
    name: entry.feature.name,
    version: entry.feature.version,
    state: entry.state,
    dependencies: Object.freeze([
      ...(entry.feature.dependencies ?? []),
    ]),
    capabilities: Object.freeze([
      ...(entry.feature.capabilities ?? []),
    ]),
    requiredServerCapabilities: Object.freeze([
      ...(entry.feature.requiredServerCapabilities ?? []),
    ]),
  });
}
