import type { ProtocolNode } from "../node/index.js";
import {
  findChildren,
  getAttribute,
} from "../semantics/index.js";
import type {
  ProtocolFeatureSet,
} from "./sync-types.js";
import type {
  ServerCapability,
  ServerCapabilityName,
  ServerCapabilitySet,
} from "./server-capability-types.js";

const NAMESPACE_MAP: Readonly<Record<string, ServerCapabilityName>> = {
  "urn:xmpp:iq": "iq",
  "urn:xmpp:presence": "presence",
  "urn:xmpp:message": "messaging",
  "urn:xmpp:receipts": "receipts",
  "urn:xmpp:media": "media",
  "urn:xmpp:groups": "groups",
  "urn:xmpp:history-sync": "history-sync",
  "urn:xmpp:device-sync": "device-sync",
  "urn:xmpp:contacts-sync": "contacts-sync",
};

const TAG_MAP: Readonly<Record<string, ServerCapabilityName>> = {
  iq: "iq",
  message: "messaging",
  presence: "presence",
  receipt: "receipts",
  media: "media",
  groups: "groups",
  "history-sync": "history-sync",
  "device-sync": "device-sync",
  "contacts-sync": "contacts-sync",
  experimental: "experimental",
};

export class ServerCapabilityMap {
  fromFeatureSet(
    features: ProtocolFeatureSet,
  ): ServerCapabilitySet {
    const capabilities = createDefaults();

    for (const namespace of features.namespaces) {
      const name =
        NAMESPACE_MAP[namespace] ??
        "experimental";

      capabilities[name] = mergeCapability(
        capabilities[name],
        {
          namespace,
          supported: true,
        },
      );
    }

    for (const tag of features.tags) {
      const name =
        TAG_MAP[tag] ??
        "experimental";

      capabilities[name] = mergeCapability(
        capabilities[name],
        {
          supported: true,
          metadata: {
            tag,
          },
        },
      );
    }

    return freezeSet(capabilities);
  }

  fromNode(node: ProtocolNode): ServerCapabilitySet {
    const features: ProtocolFeatureSet = {
      namespaces: Object.freeze(
        findChildren(node, {}).flatMap((child) => {
          const value =
            getAttribute(child, "xmlns") ??
            getAttribute(child, "ns");
          return value ? [value] : [];
        }),
      ),
      tags: Object.freeze(
        findChildren(node, {}).map((child) => child.tag),
      ),
    };

    return this.fromFeatureSet(features);
  }

  supports(
    capabilities: ServerCapabilitySet,
    name: ServerCapabilityName,
  ): boolean {
    return capabilities[name].supported;
  }
}

function createDefaults(): Record<
  ServerCapabilityName,
  ServerCapability
> {
  const names: readonly ServerCapabilityName[] = [
    "authentication",
    "iq",
    "messaging",
    "presence",
    "receipts",
    "media",
    "groups",
    "history-sync",
    "device-sync",
    "contacts-sync",
    "experimental",
  ];

  return Object.fromEntries(
    names.map((name) => [
      name,
      {
        name,
        supported: false,
        metadata: {},
      },
    ]),
  ) as Record<ServerCapabilityName, ServerCapability>;
}

function mergeCapability(
  base: ServerCapability,
  patch: Partial<ServerCapability>,
): ServerCapability {
  return Object.freeze({
    ...base,
    ...patch,
    metadata: Object.freeze({
      ...base.metadata,
      ...(patch.metadata ?? {}),
    }),
  });
}

function freezeSet(
  values: Record<
    ServerCapabilityName,
    ServerCapability
  >,
): ServerCapabilitySet {
  return Object.freeze({
    ...values,
  });
}
