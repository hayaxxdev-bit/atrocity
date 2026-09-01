import type {
  ConnectionEvent,
  ConnectionEventBus,
  ConnectionEventListener,
} from "./connection-events.js";

export class InMemoryConnectionEventBus implements ConnectionEventBus {
  private readonly listeners = new Set<ConnectionEventListener>();
  private queue: Promise<void> = Promise.resolve();

  subscribe(listener: ConnectionEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(event: ConnectionEvent): Promise<void> {
    const run = async (): Promise<void> => {
      for (const listener of [...this.listeners]) {
        await listener(event);
      }
    };

    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
