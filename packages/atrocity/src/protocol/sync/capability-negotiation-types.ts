import type {
  ServerCapabilityName,
  ServerCapabilitySet,
} from "./server-capability-types.js";

export type FeatureRequirement = {
  readonly feature: string;
  readonly required: readonly ServerCapabilityName[];
  readonly optional?: readonly ServerCapabilityName[];
};

export type NegotiationDecision =
  | "enabled"
  | "disabled"
  | "unsupported"
  | "experimental";

export type NegotiatedCapability = {
  readonly name: ServerCapabilityName;
  readonly decision: NegotiationDecision;
  readonly reason: string;
  readonly serverSupported: boolean;
  readonly requiredBy: readonly string[];
  readonly optionalFor: readonly string[];
};

export type NegotiatedCapabilitySet = Readonly<
  Record<ServerCapabilityName, NegotiatedCapability>
>;

export type CapabilityNegotiationResult = {
  readonly server: ServerCapabilitySet;
  readonly negotiated: NegotiatedCapabilitySet;
  readonly enabledFeatures: readonly string[];
  readonly disabledFeatures: readonly string[];
  readonly requiredFailures: readonly string[];
};
