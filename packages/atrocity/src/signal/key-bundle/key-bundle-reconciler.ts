import type { SignalKeyBundle } from "./prekey-bundle-types.js";
import { createKeyBundleDigest, digestEquals } from "./key-bundle-digest.js";

export type KeyBundleReconciliation =
  | { readonly status: "match"; readonly localDigest: Uint8Array }
  | { readonly status: "mismatch"; readonly localDigest: Uint8Array; readonly serverDigest: Uint8Array };

export class KeyBundleReconciler {
  compare(
    bundle: SignalKeyBundle,
    serverDigest: Uint8Array,
  ): KeyBundleReconciliation {
    const localDigest = createKeyBundleDigest(bundle);

    if (digestEquals(localDigest, serverDigest)) {
      return Object.freeze({
        status: "match",
        localDigest: localDigest.slice(),
      });
    }

    return Object.freeze({
      status: "mismatch",
      localDigest: localDigest.slice(),
      serverDigest: serverDigest.slice(),
    });
  }
}
