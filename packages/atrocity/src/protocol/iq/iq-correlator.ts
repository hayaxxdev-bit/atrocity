import type { ProtocolNode } from "../node/index.js";
import { isErrorIq, isIq } from "../semantics/index.js";
import { IqError } from "./iq-errors.js";
import type {
  IqRequestOptions,
  PendingIq,
} from "./iq-types.js";

export type IqCorrelationTransport = {
  readonly sendIq: (node: ProtocolNode) => Promise<void>;
};

export class IqCorrelator {
  private readonly pending = new Map<string, PendingIq>();

  constructor(
    private readonly transport: IqCorrelationTransport,
    private readonly defaultTimeoutMs = 15_000,
  ) {
    if (!Number.isSafeInteger(defaultTimeoutMs) || defaultTimeoutMs <= 0) {
      throw new RangeError("IQ timeout must be a positive safe integer.");
    }
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  async request(
    node: ProtocolNode,
    options: IqRequestOptions = {},
  ): Promise<ProtocolNode> {
    validateRequestNode(node);

    const id = node.attrs.id;
    if (!id) {
      throw new IqError(
        "IQ_INVALID_REQUEST",
        "Outgoing IQ request requires an id attribute.",
      );
    }

    if (this.pending.has(id)) {
      throw new IqError(
        "IQ_DUPLICATE_ID",
        `An IQ request with id "${id}" is already pending.`,
      );
    }

    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
      throw new IqError(
        "IQ_INVALID_REQUEST",
        "IQ timeout must be a positive safe integer.",
      );
    }

    return new Promise<ProtocolNode>((resolve, reject) => {
      const createdAt = Date.now();
      const timer = setTimeout(() => {
        const pending = this.pending.get(id);
        if (!pending) return;

        this.pending.delete(id);
        pending.reject(
          new IqError(
            "IQ_TIMEOUT",
            `IQ request "${id}" timed out after ${timeoutMs}ms.`,
          ),
        );
      }, timeoutMs);

      const abort = (): void => {
        const pending = this.pending.get(id);
        if (!pending) return;

        clearTimeout(timer);
        this.pending.delete(id);

        pending.reject(
          new IqError(
            "IQ_ABORTED",
            `IQ request "${id}" was aborted.`,
          ),
        );
      };

      const pending: PendingIq = {
        id,
        createdAt,
        timeoutAt: createdAt + timeoutMs,
        resolve: (response) => {
          clearTimeout(timer);
          options.signal?.removeEventListener("abort", abort);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timer);
          options.signal?.removeEventListener("abort", abort);
          reject(error);
        },
      };

      this.pending.set(id, pending);

      if (options.signal) {
        if (options.signal.aborted) {
          abort();
          return;
        }
        options.signal.addEventListener(
          "abort",
          abort,
          { once: true },
        );
      }

      void this.sendTracked(node, pending, timer, abort);
    });
  }

  resolve(node: ProtocolNode): boolean {
    if (!isIq(node)) return false;

    const id = node.attrs.id;
    if (!id) return false;

    const pending = this.pending.get(id);
    if (!pending) return false;

    this.pending.delete(id);

    if (isErrorIq(node)) {
      pending.reject(
        new IqError(
          "IQ_REMOTE_ERROR",
          `Remote IQ error received for request "${id}".`,
        ),
      );
      return true;
    }

    pending.resolve(node);
    return true;
  }

  rejectAll(
    reason = new IqError(
      "IQ_CONNECTION_CLOSED",
      "Connection closed while IQ requests were pending.",
    ),
  ): number {
    const entries = [...this.pending.values()];
    this.pending.clear();

    for (const entry of entries) {
      entry.reject(reason);
    }

    return entries.length;
  }

  pendingIds(): readonly string[] {
    return Object.freeze([...this.pending.keys()]);
  }

  private async sendTracked(
    node: ProtocolNode,
    pending: PendingIq,
    timer: ReturnType<typeof setTimeout>,
    abort: () => void,
  ): Promise<void> {
    try {
      await this.transport.sendIq(node);
    } catch (error) {
      if (!this.pending.has(pending.id)) return;

      clearTimeout(timer);
      this.pending.delete(pending.id);
      abort();

      pending.reject(
        new IqError(
          "IQ_CONNECTION_CLOSED",
          `Failed to send IQ request "${pending.id}".`,
          { cause: error },
        ),
      );
    }
  }
}

function validateRequestNode(node: ProtocolNode): void {
  if (!isIq(node)) {
    throw new IqError(
      "IQ_INVALID_REQUEST",
      `Expected <iq>, received <${node.tag}>.`,
    );
  }

  const type = node.attrs.type;
  if (type !== "get" && type !== "set") {
    throw new IqError(
      "IQ_INVALID_REQUEST",
      `Outgoing IQ must have type "get" or "set", received "${type ?? "undefined"}".`,
    );
  }
}
