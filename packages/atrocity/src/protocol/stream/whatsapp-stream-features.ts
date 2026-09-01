import type { ProtocolNode } from "../node/index.js";
import type { ProtocolFeatureSet } from "../sync/sync-types.js";
import { FeatureDiscovery } from "../sync/feature-discovery.js";

export type WhatsAppStreamFeatures = {
  readonly node: ProtocolNode;
  readonly features: ProtocolFeatureSet;
};

export class WhatsAppStreamFeaturesDecoder {
  constructor(private readonly discovery = new FeatureDiscovery()) {}

  decode(node: ProtocolNode): WhatsAppStreamFeatures {
    return Object.freeze({
      node,
      features: this.discovery.discover(node),
    });
  }
}
