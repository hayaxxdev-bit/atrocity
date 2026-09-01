import type { ProtocolNode } from "../node/index.js";
import { findChildren, isTag } from "../semantics/index.js";
import type { ProtocolFeatureSet } from "./sync-types.js";
import { SyncError } from "./sync-errors.js";

export class FeatureDiscovery {
  discover(node: ProtocolNode): ProtocolFeatureSet {
    if (!isTag(node, "stream:features")) {
      throw new SyncError(
        "SYNC_FEATURES_INVALID",
        `Expected <stream:features>, received <${node.tag}>.`,
      );
    }

    const namespaces: string[] = [];
    const tags: string[] = [];

    for (const child of findChildren(node, {})) {
      tags.push(child.tag);

      const namespace =
        child.attrs.xmlns ??
        child.attrs.ns;

      if (namespace) {
        namespaces.push(namespace);
      }
    }

    return Object.freeze({
      namespaces: Object.freeze([...new Set(namespaces)]),
      tags: Object.freeze([...new Set(tags)]),
    });
  }
}
