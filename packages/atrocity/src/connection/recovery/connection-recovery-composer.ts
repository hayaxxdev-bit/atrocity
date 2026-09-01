import {
  ConnectionRecoveryError,
} from "./connection-recovery-errors";
import type {
  ConnectionCloseSignal,
  ConnectionRecoveryAction,
} from "./connection-close-types";
import type { ConnectionCloseClassifier } from "./connection-close-classifier";
import type {
  RecoveryCompositionHandlers,
  RecoveryCompositionResult,
} from "./recovery-composition-types";

export class ConnectionRecoveryComposer {
  private running = false;

  constructor(
    private readonly classifier: ConnectionCloseClassifier,
    private readonly handlers: RecoveryCompositionHandlers,
  ) {}

  public async recover(
    signal: ConnectionCloseSignal,
  ): Promise<RecoveryCompositionResult> {
    if (this.running) {
      throw new ConnectionRecoveryError(
        "Recovery composition is already running.",
      );
    }

    this.running = true;

    try {
      const classified = this.classifier.classify(signal);
      const recovered = await this.execute(classified.action, signal);

      return {
        action: classified.action,
        recovered,
        signal,
      };
    } finally {
      this.running = false;
    }
  }

  private async execute(
    action: ConnectionRecoveryAction,
    signal: ConnectionCloseSignal,
  ): Promise<boolean> {
    switch (action) {
      case "reconnect":
        return this.handlers.reconnect(signal);
      case "reauthenticate":
        return this.handlers.reauthenticate(signal);
      case "repair-session":
        return this.handlers.repairSession(signal);
      case "terminal":
        return this.handlers.terminal(signal);
    }
  }
}
