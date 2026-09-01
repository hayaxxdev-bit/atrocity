export type ProtocolFeatureState =
  | "registered"
  | "starting"
  | "started"
  | "stopping"
  | "stopped"
  | "failed";

export type ProtocolFeatureContext = {
  readonly featureName: string;
};

export type ProtocolFeature = {
  readonly name: string;
  readonly version: number;
  readonly dependencies?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly requiredServerCapabilities?: readonly import("../sync/index.js").ServerCapabilityName[];
  readonly start: (context: ProtocolFeatureContext) => Promise<void> | void;
  readonly stop: (context: ProtocolFeatureContext) => Promise<void> | void;
};

export type ProtocolFeatureSnapshot = {
  readonly name: string;
  readonly version: number;
  readonly state: ProtocolFeatureState;
  readonly dependencies: readonly string[];
  readonly capabilities: readonly string[];
  readonly requiredServerCapabilities: readonly import("../sync/index.js").ServerCapabilityName[];
};
