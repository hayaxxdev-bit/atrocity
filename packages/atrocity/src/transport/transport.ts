import { TransportError } from "./transport-errors.js";
import type {
  TransportCloseInfo,
  TransportHandlers,
  TransportState,
} from "./transport-types.js";

export interface Transport {
  readonly state: TransportState;
  readonly handlers: TransportHandlers;

  connect(): Promise<void>;
  send(data: Uint8Array): Promise<void>;
  close(info?: TransportCloseInfo): Promise<void>;
  setHandlers(handlers: TransportHandlers): void;
}

export abstract class BaseTransport implements Transport {
  private stateValue: TransportState = "idle";
  private handlersValue: TransportHandlers = {};

  get state(): TransportState {
    return this.stateValue;
  }

  get handlers(): TransportHandlers {
    return this.handlersValue;
  }

  setHandlers(handlers: TransportHandlers): void {
    this.handlersValue = Object.freeze({ ...handlers });
  }

  protected transition(next: TransportState): void {
    this.stateValue = next;
  }

  protected requireState(expected: TransportState): void {
    if (this.stateValue !== expected) {
      throw new TransportError(
        "TRANSPORT_OPERATION_FAILED",
        `Transport is ${this.stateValue}, expected ${expected}.`,
      );
    }
  }

  protected requireSendable(): void {
    if (this.stateValue !== "open") {
      throw new TransportError(
        "TRANSPORT_NOT_OPEN",
        `Cannot send while transport is ${this.stateValue}.`,
      );
    }
  }

  protected async emitOpen(): Promise<void> {
    await this.handlersValue.onOpen?.();
  }

  protected async emitData(data: Uint8Array): Promise<void> {
    if (!(data instanceof Uint8Array)) {
      throw new TransportError(
        "TRANSPORT_INVALID_DATA",
        "Transport data must be a Uint8Array.",
      );
    }
    await this.handlersValue.onData?.(data);
  }

  protected async emitClose(info: TransportCloseInfo): Promise<void> {
    await this.handlersValue.onClose?.(Object.freeze({ ...info }));
  }

  protected async emitError(error: TransportError): Promise<void> {
    await this.handlersValue.onError?.(error);
  }
}

export async function safeTransportSend(
  transport: Transport,
  data: Uint8Array,
): Promise<void> {
  try {
    await transport.send(data);
  } catch (error) {
    if (error instanceof TransportError) {
      throw error;
    }
    throw new TransportError(
      "TRANSPORT_OPERATION_FAILED",
      "Transport send operation failed.",
      { cause: error },
    );
  }
}
