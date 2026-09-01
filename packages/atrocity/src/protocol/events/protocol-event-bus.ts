import { ProtocolEventError } from "./protocol-event-errors.js";
import type {
  ProtocolEventListener,
  ProtocolEventMap,
  ProtocolEventName,
} from "./protocol-event-types.js";

type ErasedListener = (
  payload: unknown,
) => void | Promise<void>;

export class ProtocolEventBus {
  private readonly listeners = new Map<
    ProtocolEventName,
    Set<ErasedListener>
  >();

  private readonly queues = new Map<
    ProtocolEventName,
    Promise<void>
  >();

  on<Name extends ProtocolEventName>(
    name: Name,
    listener: ProtocolEventListener<Name>,
  ): () => void {
    let listeners = this.listeners.get(name);

    if (!listeners) {
      listeners = new Set<ErasedListener>();
      this.listeners.set(name, listeners);
    }

    const erased: ErasedListener = (payload) => listener(
      payload as ProtocolEventMap[Name],
    );

    listeners.add(erased);

    return () => {
      listeners?.delete(erased);
      if (listeners?.size === 0) {
        this.listeners.delete(name);
      }
    };
  }

  once<Name extends ProtocolEventName>(
    name: Name,
    listener: ProtocolEventListener<Name>,
  ): () => void {
    let unsubscribe: (() => void) | undefined;

    unsubscribe = this.on(name, async (payload) => {
      unsubscribe?.();
      await listener(payload);
    });

    return unsubscribe;
  }

  async emit<Name extends ProtocolEventName>(
    name: Name,
    payload: ProtocolEventMap[Name],
  ): Promise<void> {
    const previous = this.queues.get(name) ?? Promise.resolve();

    const current = previous.then(
      () => this.dispatch(name, payload),
      () => this.dispatch(name, payload),
    );

    this.queues.set(
      name,
      current.then(() => undefined, () => undefined),
    );

    try {
      await current;
    } finally {
      if (this.queues.get(name) === current) {
        this.queues.delete(name);
      }
    }
  }

  listenerCount<Name extends ProtocolEventName>(
    name: Name,
  ): number {
    return this.listeners.get(name)?.size ?? 0;
  }

  clear(name?: ProtocolEventName): void {
    if (name) {
      this.listeners.delete(name);
      this.queues.delete(name);
      return;
    }

    this.listeners.clear();
    this.queues.clear();
  }

  private async dispatch<Name extends ProtocolEventName>(
    name: Name,
    payload: ProtocolEventMap[Name],
  ): Promise<void> {
    const listeners = this.listeners.get(name);

    if (!listeners || listeners.size === 0) return;

    for (const listener of [...listeners]) {
      try {
        await listener(payload);
      } catch (error) {
        throw new ProtocolEventError(
          "PROTOCOL_EVENT_HANDLER_FAILED",
          `Protocol event handler failed for "${name}".`,
          { cause: error },
        );
      }
    }
  }
}
