import { BaseTransport } from "../transport.js";
import { TransportError } from "../transport-errors.js";
import type {
  TransportCloseInfo,
  TransportHandlers,
} from "../transport-types.js";

export type WebSocketLike = {
  binaryType: string;
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send(data: ArrayBuffer | ArrayBufferView | Blob | string): void;
  close(code?: number, reason?: string): void;
};

export type WebSocketFactory = (url: string) => WebSocketLike;

const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

export type WebSocketTransportOptions = {
  readonly url: string;
  readonly createSocket?: WebSocketFactory;
  readonly connectTimeoutMs?: number;
  readonly closeTimeoutMs?: number;
};

/**
 * Native-WebSocket adapter. No protocol semantics live here.
 *
 * Node 22+ supplies a WebSocket implementation through the global
 * runtime in environments where it is enabled; dependency injection
 * is supported for deterministic tests and alternate runtimes.
 */
export class WebSocketTransport extends BaseTransport {
  private socket?: WebSocketLike;
  private generation = 0;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;

  private readonly url: string;
  private readonly createSocket: WebSocketFactory;
  private readonly connectTimeoutMs: number;
  private readonly closeTimeoutMs: number;

  constructor(options: WebSocketTransportOptions, handlers: TransportHandlers = {}) {
    super();
    if (!options.url) {
      throw new TransportError(
        "TRANSPORT_CONNECTION_FAILED",
        "WebSocket URL must be provided.",
      );
    }

    this.url = options.url;
    this.createSocket = options.createSocket ?? defaultWebSocketFactory;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 15_000;
    this.closeTimeoutMs = options.closeTimeoutMs ?? 5_000;
    this.setHandlers(handlers);
  }

  connect(): Promise<void> {
    if (this.state === "open") {
      return Promise.resolve();
    }

    if (this.state === "connecting") {
      return Promise.reject(
        new TransportError(
          "TRANSPORT_ALREADY_CONNECTING",
          "WebSocket transport is already connecting.",
        ),
      );
    }

    if (this.state === "closed" || this.state === "failed") {
      // A WebSocketTransport instance owns one connection generation.
      // A new transport object is required after terminal close/failure.
      return Promise.reject(
        new TransportError(
          "TRANSPORT_CLOSED",
          "This WebSocket transport instance is terminally closed.",
        ),
      );
    }

    this.transition("connecting");
    const generation = ++this.generation;

    let socket: WebSocketLike;
    try {
      socket = this.createSocket(this.url);
    } catch (error) {
      this.transition("failed");
      const transportError = new TransportError(
        "TRANSPORT_CONNECTION_FAILED",
        "Failed to create WebSocket.",
        { cause: error },
      );
      void this.emitError(transportError);
      return Promise.reject(transportError);
    }

    this.socket = socket;
    socket.binaryType = "arraybuffer";

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const finishReject = (error: TransportError) => {
        if (settled) return;
        settled = true;
        this.clearConnectTimer();

        if (this.generation === generation) {
          this.transition("failed");
        }

        reject(error);
      };

      const finishResolve = () => {
        if (settled) return;
        settled = true;
        this.clearConnectTimer();

        if (this.generation !== generation || this.socket !== socket) {
          reject(
            new TransportError(
              "TRANSPORT_OPERATION_FAILED",
              "Stale WebSocket generation opened.",
            ),
          );
          return;
        }

        this.transition("open");
        void this.emitOpen();
        resolve();
      };

      socket.onopen = () => finishResolve();

      socket.onmessage = (event: MessageEvent) => {
        if (this.generation !== generation || this.socket !== socket) {
          return;
        }
        void this.handleMessage(event);
      };

      socket.onerror = (event: Event) => {
        if (this.generation !== generation || this.socket !== socket) {
          return;
        }

        const error = new TransportError(
          "TRANSPORT_OPERATION_FAILED",
          "WebSocket reported an error.",
          { cause: event },
        );
        void this.emitError(error);

        if (this.state === "connecting") {
          finishReject(
            new TransportError(
              "TRANSPORT_CONNECTION_FAILED",
              "WebSocket connection failed.",
              { cause: event },
            ),
          );
        }
      };

      socket.onclose = (event: CloseEvent) => {
        if (this.generation !== generation || this.socket !== socket) {
          return;
        }

        this.clearConnectTimer();
        this.clearCloseTimer();

        const info = normalizeClose(event);

        if (this.state === "closing" || this.state === "open" || this.state === "connecting") {
          this.transition("closed");
        }

        void this.emitClose(info);

        if (!settled) {
          finishReject(
            new TransportError(
              "TRANSPORT_CONNECTION_FAILED",
              `WebSocket closed before opening (code ${event.code}).`,
            ),
          );
        }
      };

      this.connectTimer = setTimeout(() => {
        if (settled || this.generation !== generation) {
          return;
        }

        try {
          socket.close();
        } catch {
          // Ignore close errors during timeout cleanup.
        }

        finishReject(
          new TransportError(
            "TRANSPORT_CONNECTION_FAILED",
            `WebSocket connection timed out after ${this.connectTimeoutMs} ms.`,
          ),
        );
      }, this.connectTimeoutMs);
    });
  }

  async send(data: Uint8Array): Promise<void> {
    this.requireSendable();

    if (!(data instanceof Uint8Array)) {
      throw new TransportError(
        "TRANSPORT_INVALID_DATA",
        "WebSocket transport data must be a Uint8Array.",
      );
    }

    const socket = this.socket;
    if (!socket || socket.readyState !== WS_OPEN) {
      throw new TransportError(
        "TRANSPORT_NOT_OPEN",
        "Underlying WebSocket is not open.",
      );
    }

    try {
      socket.send(data);
    } catch (error) {
      const transportError = new TransportError(
        "TRANSPORT_OPERATION_FAILED",
        "WebSocket send failed.",
        { cause: error },
      );
      await this.emitError(transportError);
      throw transportError;
    }
  }

  async close(info: TransportCloseInfo = { reason: "requested" }): Promise<void> {
    const socket = this.socket;

    if (!socket || socket.readyState === WS_CLOSED) {
      this.transition("closed");
      return;
    }

    this.clearConnectTimer();
    this.transition("closing");

    return new Promise<void>((resolve) => {
      let settled = false;
      const finish = async () => {
        if (settled) return;
        settled = true;
        this.clearCloseTimer();
        this.transition("closed");
        resolve();
      };

      const previousOnClose = socket.onclose;
      socket.onclose = (event: CloseEvent) => {
        previousOnClose?.(event);
        void this.emitClose(info).finally(finish);
      };

      this.closeTimer = setTimeout(() => {
        void finish();
      }, this.closeTimeoutMs);

      try {
        socket.close();
      } catch {
        void finish();
      }
    });
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    const data = await normalizeMessageData(event.data);
    if (!data) {
      const error = new TransportError(
        "TRANSPORT_INVALID_DATA",
        "WebSocket message was not binary data.",
      );
      await this.emitError(error);
      return;
    }

    await this.emitData(data);
  }

  private clearConnectTimer(): void {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }
}

async function normalizeMessageData(data: unknown): Promise<Uint8Array | undefined> {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    ).slice();
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  return undefined;
}

function normalizeClose(event: CloseEvent): TransportCloseInfo {
  return Object.freeze({
    reason: event.code === 1000 ? "remote" : "error",
    code: event.code,
    message: event.reason || undefined,
  });
}

function defaultWebSocketFactory(url: string): WebSocketLike {
  const WebSocketCtor = (globalThis as unknown as {
    WebSocket?: new (url: string) => WebSocketLike;
  }).WebSocket;

  if (!WebSocketCtor) {
    throw new TransportError(
      "TRANSPORT_CONNECTION_FAILED",
      "No WebSocket implementation is available in the current runtime.",
    );
  }

  return new WebSocketCtor(url);
}
