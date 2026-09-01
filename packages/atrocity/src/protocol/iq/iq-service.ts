import type { ProtocolNode } from "../node/index.js";
import { isErrorIq, isIq } from "../semantics/index.js";
import { IqCorrelator, type IqCorrelationTransport } from "./iq-correlator.js";
import { IqError } from "./iq-errors.js";
import { RequestIdGenerator } from "./request-id-generator.js";
import {
  buildIqGet,
  buildIqSet,
} from "./iq-builders.js";
import type { IqRequestOptions } from "./iq-types.js";

export type IqOperation = {
  readonly id?: string;
  readonly content?: readonly unknown[];
  readonly to?: string;
};

export class IqService {
  readonly correlator: IqCorrelator;
  readonly requestIds: RequestIdGenerator;

  constructor(
    transport: IqCorrelationTransport,
    defaultTimeoutMs = 15_000,
    requestIds = new RequestIdGenerator(),
  ) {
    this.correlator = new IqCorrelator(
      transport,
      defaultTimeoutMs,
    );
    this.requestIds = requestIds;
  }

  async get(
    operation: IqOperation,
    options?: IqRequestOptions,
  ): Promise<ProtocolNode> {
    return this.correlator.request(
      buildIqGet(
        operation.id ?? this.requestIds.next(),
        operation.content,
        operation.to,
      ),
      options,
    );
  }

  async set(
    operation: IqOperation,
    options?: IqRequestOptions,
  ): Promise<ProtocolNode> {
    return this.correlator.request(
      buildIqSet(
        operation.id ?? this.requestIds.next(),
        operation.content,
        operation.to,
      ),
      options,
    );
  }

  async request(
    node: ProtocolNode,
    options?: IqRequestOptions,
  ): Promise<ProtocolNode> {
    if (!isIq(node)) {
      throw new IqError(
        "IQ_INVALID_REQUEST",
        "IqService.request() requires an <iq> node.",
      );
    }

    return this.correlator.request(node, options);
  }

  close(): void {
    this.correlator.rejectAll(
      new IqError(
        "IQ_CONNECTION_CLOSED",
        "IQ service closed while requests were pending.",
      ),
    );
  }
}

export function isIqResult(node: ProtocolNode): boolean {
  return isIq(node) && node.attrs.type === "result";
}

export function isIqRemoteError(node: ProtocolNode): boolean {
  return isErrorIq(node);
}
