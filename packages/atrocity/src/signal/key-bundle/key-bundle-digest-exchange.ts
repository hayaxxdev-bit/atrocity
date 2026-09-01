import type { IqClient } from "../../protocol/iq/index.js";
import type { ProtocolNode } from "../../protocol/node/index.js";
import { buildEncryptDigestIq } from "../../protocol/iq/whatsapp/index.js";
import type { SignalKeyBundle } from "./prekey-bundle-types.js";
import { createKeyBundleDigest, digestEquals } from "./key-bundle-digest.js";
import {
  KeyBundleDigestExchangeError,
} from "./key-bundle-digest-exchange-errors.js";

export type KeyBundleDigestExchangeDependencies = {
  readonly iq: Pick<IqClient, "request">;
  readonly nextIqId: () => string;
  readonly parseDigest?: (
    node: ProtocolNode,
  ) => Uint8Array | undefined;
};

export class KeyBundleDigestExchange {
  constructor(
    private readonly dependencies: KeyBundleDigestExchangeDependencies,
  ) {}

  async query(
    bundle: SignalKeyBundle,
  ): Promise<import("./key-bundle-digest-exchange-types.js").KeyBundleDigestExchangeResult> {
    const localDigest = createKeyBundleDigest(bundle);
    const iqId = this.dependencies.nextIqId();

    let response: ProtocolNode;

    try {
      response = await this.dependencies.iq.request(
        buildEncryptDigestIq(iqId),
      );
    } catch (error) {
      throw new KeyBundleDigestExchangeError(
        "KEY_BUNDLE_DIGEST_QUERY_FAILED",
        "Failed to query server key-bundle digest.",
        { cause: error },
      );
    }

    const serverDigest =
      this.dependencies.parseDigest?.(response) ??
      parseDigest(response);

    if (!serverDigest) {
      return Object.freeze({
        status: "repair-required",
        localDigest: localDigest.slice(),
      });
    }

    if (serverDigest.byteLength !== localDigest.byteLength) {
      return Object.freeze({
        status: "mismatch",
        localDigest: localDigest.slice(),
        serverDigest: serverDigest.slice(),
      });
    }

    return Object.freeze({
      status: digestEquals(localDigest, serverDigest)
        ? "match"
        : "mismatch",
      localDigest: localDigest.slice(),
      serverDigest: serverDigest.slice(),
    });
  }
}

function parseDigest(node: ProtocolNode): Uint8Array | undefined {
  const digestNode = node.content?.find((child) => child.tag === "digest");
  if (!digestNode) return undefined;

  if (digestNode.content?.kind !== "binary") {
    throw new KeyBundleDigestExchangeError(
      "KEY_BUNDLE_DIGEST_INVALID",
      "Server digest node must contain binary data.",
    );
  }

  return digestNode.content.value.slice();
}
