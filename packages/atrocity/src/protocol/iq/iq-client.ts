import type { ProtocolNode } from "../node/index.js";
import { IqCorrelator, type IqCorrelationTransport } from "./iq-correlator.js";
import type { IqRequestOptions } from "./iq-types.js";
import { IqError } from "./iq-errors.js";

export type IqClientTransport = IqCorrelationTransport & {
  readonly onNode?: (handler: (node: ProtocolNode) => void) => () => void;
};

export class IqClient {
  readonly correlator: IqCorrelator;
  private unsubscribe?: () => void;

  constructor(
    transport: IqClientTransport,
    defaultTimeoutMs = 15_000,
  ) {
    this.correlator = new IqCorrelator(
      transport,
      defaultTimeoutMs,
    );

    if (transport.onNode) {
      this.unsubscribe = transport.onNode((node) => {
        this.correlator.resolve(node);
      });
    }
  }

  async request(
    node: ProtocolNode,
    options?: IqRequestOptions,
  ): Promise<ProtocolNode> {
    return this.correlator.request(node, options);
  }

  resolve(node: ProtocolNode): boolean {
    return this.correlator.resolve(node);
  }

  pendingCount(): number {
    return this.correlator.pendingCount;
  }

  close(): void {
    this.correlator.rejectAll(
      new IqError(
        "IQ_CONNECTION_CLOSED",
        "IQ client was closed while requests were pending.",
      ),
    );
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
