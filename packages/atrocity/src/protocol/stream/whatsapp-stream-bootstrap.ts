import type { ProtocolRuntime } from "../runtime/index.js";
import type { FeatureRequirement } from "../sync/capability-negotiation-types.js";
import { StreamRuntime } from "./stream-runtime.js";
import type { StreamNodeTransport, StreamRuntimeResult } from "./stream-runtime.js";
import {
  buildWhatsAppStreamOpen,
  type WhatsAppStreamOpenConfig,
} from "./whatsapp-stream-open.js";

export type WhatsAppStreamBootstrapOptions = {
  readonly open: WhatsAppStreamOpenConfig;
  readonly transport: StreamNodeTransport;
  readonly protocol: ProtocolRuntime;
  readonly featureRequirements?: readonly FeatureRequirement[];
  readonly featureTimeoutMs?: number;
};

export class WhatsAppStreamBootstrap {
  readonly runtime: StreamRuntime;

  constructor(private readonly options: WhatsAppStreamBootstrapOptions) {
    this.runtime = new StreamRuntime(
      options.transport,
      options.protocol,
      {
        featureRequirements: options.featureRequirements,
        featureTimeoutMs: options.featureTimeoutMs,
        buildStreamOpenNode: () => buildWhatsAppStreamOpen(options.open),
      },
    );
  }

  markAuthenticated(): void {
    this.runtime.markAuthenticated();
  }

  open(): Promise<StreamRuntimeResult> {
    return this.runtime.open();
  }

  close(): Promise<void> {
    return this.runtime.close();
  }

  buildOpenNode() {
    return buildWhatsAppStreamOpen(this.options.open);
  }
}
