import {
  ConnectionRecoveryError,
} from "./connection-recovery-errors";
import type {
  ConnectionCloseSignal,
  ConnectionRecoveryAction,
} from "./connection-close-types";
import type { ConnectionCloseClassifier } from "./connection-close-classifier";

export type ConnectionRecoveryRouterHandlers = {
  reconnect: (signal: ConnectionCloseSignal) => Promise<void>;
  reauthenticate: (signal: ConnectionCloseSignal) => Promise<void>;
  repairSession: (signal: ConnectionCloseSignal) => Promise<void>;
  terminal: (signal: ConnectionCloseSignal) => Promise<void>;
};

export class ConnectionRecoveryRouter {
  constructor(
    private readonly classifier: ConnectionCloseClassifier,
    private readonly handlers: ConnectionRecoveryRouterHandlers,
  ) {}

  public async route(signal: ConnectionCloseSignal): Promise<ConnectionRecoveryAction> {
    const classified = this.classifier.classify(signal);

    switch (classified.action) {
      case "reconnect":
        await this.handlers.reconnect(signal);
        return classified.action;

      case "reauthenticate":
        await this.handlers.reauthenticate(signal);
        return classified.action;

      case "repair-session":
        await this.handlers.repairSession(signal);
        return classified.action;

      case "terminal":
        await this.handlers.terminal(signal);
        return classified.action;

      default:
        throw new ConnectionRecoveryError("Unsupported connection recovery action.");
    }
  }
}
