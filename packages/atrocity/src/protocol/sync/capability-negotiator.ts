import type {
  ServerCapabilityName,
  ServerCapabilitySet,
} from "./server-capability-types.js";
import {
  CapabilityNegotiationError,
} from "./capability-negotiation-errors.js";
import type {
  CapabilityNegotiationResult,
  FeatureRequirement,
  NegotiatedCapability,
  NegotiatedCapabilitySet,
} from "./capability-negotiation-types.js";

export class CapabilityNegotiator {
  negotiate(
    server: ServerCapabilitySet,
    requirements: readonly FeatureRequirement[],
  ): CapabilityNegotiationResult {
    const requiredBy = new Map<ServerCapabilityName, string[]>();
    const optionalFor = new Map<ServerCapabilityName, string[]>();
    const enabledFeatures: string[] = [];
    const disabledFeatures: string[] = [];
    const requiredFailures: string[] = [];

    for (const requirement of requirements) {
      validateRequirement(requirement);

      for (const name of requirement.required) {
        add(requiredBy, name, requirement.feature);
      }

      for (const name of requirement.optional ?? []) {
        add(optionalFor, name, requirement.feature);
      }

      const missingRequired = requirement.required.filter(
        (name) => !server[name]?.supported,
      );

      if (missingRequired.length === 0) {
        enabledFeatures.push(requirement.feature);
      } else {
        disabledFeatures.push(requirement.feature);
        requiredFailures.push(
          `${requirement.feature}: ${missingRequired.join(", ")}`,
        );
      }
    }

    const negotiated = {} as Record<
      ServerCapabilityName,
      NegotiatedCapability
    >;

    for (const [name, capability] of Object.entries(server) as [
      ServerCapabilityName,
      ServerCapabilitySet[ServerCapabilityName],
    ][]) {
      const required = requiredBy.get(name) ?? [];
      const optional = optionalFor.get(name) ?? [];

      let decision: NegotiatedCapability["decision"] = "disabled";
      let reason = "Capability is not required by an active feature.";

      if (capability.supported && required.length > 0) {
        decision = "enabled";
        reason = "Server supports a capability required by a feature.";
      } else if (capability.supported && optional.length > 0) {
        decision = "enabled";
        reason = "Server supports an optional capability requested by a feature.";
      } else if (capability.supported && name === "experimental") {
        decision = "experimental";
        reason = "Capability was discovered but is treated as experimental.";
      } else if (!capability.supported && required.length > 0) {
        decision = "unsupported";
        reason = "A required feature dependency is not supported by the server.";
      }

      negotiated[name] = Object.freeze({
        name,
        decision,
        reason,
        serverSupported: capability.supported,
        requiredBy: Object.freeze([...required]),
        optionalFor: Object.freeze([...optional]),
      });
    }

    if (requiredFailures.length > 0) {
      // Negotiation itself remains inspectable. The caller can decide whether
      // a missing feature should be fatal; strict mode is a separate method.
    }

    return Object.freeze({
      server,
      negotiated: Object.freeze(negotiated),
      enabledFeatures: Object.freeze([...enabledFeatures]),
      disabledFeatures: Object.freeze([...disabledFeatures]),
      requiredFailures: Object.freeze([...requiredFailures]),
    });
  }

  negotiateStrict(
    server: ServerCapabilitySet,
    requirements: readonly FeatureRequirement[],
  ): CapabilityNegotiationResult {
    const result = this.negotiate(server, requirements);

    if (result.requiredFailures.length > 0) {
      throw new CapabilityNegotiationError(
        "CAPABILITY_REQUIRED_UNAVAILABLE",
        `Required protocol capabilities are unavailable: ${result.requiredFailures.join("; ")}.`,
      );
    }

    return result;
  }
}

function add(
  map: Map<ServerCapabilityName, string[]>,
  name: ServerCapabilityName,
  feature: string,
): void {
  const values = map.get(name) ?? [];
  values.push(feature);
  map.set(name, values);
}

function validateRequirement(
  requirement: FeatureRequirement,
): void {
  if (!requirement.feature) {
    throw new CapabilityNegotiationError(
      "CAPABILITY_NEGOTIATION_INVALID",
      "Feature requirement requires a feature name.",
    );
  }
}
