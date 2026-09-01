import {
  BaseTransport,
  type Transport,
} from "./transport.js";
import { TransportError } from "./transport-errors.js";
import type { TransportCloseInfo } from "./transport-types.js";

/**
 * Deterministic transport for unit tests.
 *
 * It deliberately has no network behavior.
 */
export class InMemoryTransport extends BaseTransport implements Transport {
  private peer?: InMemoryTransport;

  connect(): Promise<void> {
    if (this.state === "open") return Promise.resolve();

    if (this.state === "connecting") {
      return Promise.reject(new TransportError(
        "TRANSPORT_ALREADY_CONNECTING",
        "Transport is already connecting.",
      ));
    }

    this.transition("connecting");
    this.transition("open");
    return this.emitOpen();
  }

  async send(data: Uint8Array): Promise<void> {
    this.requireSendable();

    if (!(data instanceof Uint8Array)) {
      throw new TransportError(
        "TRANSPORT_INVALID_DATA",
        "Transport data must be a Uint8Array.",
      );
    }

    if (!this.peer || this.peer.state !== "open") {
      throw new TransportError(
        "TRANSPORT_CONNECTION_FAILED",
        "In-memory transport peer is unavailable.",
      );
    }

    await this.peer.inject(data);
  }

  async close(info: TransportCloseInfo = { reason: "requested" }): Promise<void> {
    if (this.state === "closed" || this.state === "idle") {
      this.transition("closed");
      return;
    }

    this.transition("closing");
    this.transition("closed");
    await this.emitClose(info);
  }

  link(peer: InMemoryTransport): void {
    if (peer === this) {
      throw new TransportError(
        "TRANSPORT_OPERATION_FAILED",
        "A transport cannot be linked to itself.",
      );
    }
    this.peer = peer;
  }

  async inject(data: Uint8Array): Promise<void> {
    await this.emitData(data.slice());
  }
}

export function createTransportPair(): readonly [
  InMemoryTransport,
  InMemoryTransport,
] {
  const left = new InMemoryTransport();
  const right = new InMemoryTransport();
  left.link(right);
  right.link(left);
  return [left, right] as const;
}
