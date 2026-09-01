import {
  ConnectionRecoveryError,
} from "./connection-recovery-errors.js";
import type {
  ConnectionRecoveryEvent,
  ConnectionRecoverySnapshot,
  ConnectionRecoveryState,
} from "./connection-recovery-types.js";

const ALLOWED: Record<ConnectionRecoveryState, ConnectionRecoveryEvent["type"][]> = {
  connected: ["disconnect"],
  disconnected: ["reconnect-started"],
  reconnecting: ["reconnect-succeeded", "reconnect-failed"],
  reauthenticating: ["reauthentication-succeeded", "reauthentication-failed"],
  resyncing: ["resync-succeeded", "resync-failed"],
  failed: ["reset-to-connected"],
};

export class ConnectionRecoveryStateMachine {
  private snapshot: ConnectionRecoverySnapshot = {
    state: "connected",
    attempt: 0,
  };

  public getSnapshot(): ConnectionRecoverySnapshot {
    return { ...this.snapshot };
  }

  public dispatch(event: ConnectionRecoveryEvent): ConnectionRecoverySnapshot {
    const allowed = ALLOWED[this.snapshot.state] ?? [];
    if (!allowed.includes(event.type)) {
      throw new ConnectionRecoveryError(
        `Invalid recovery transition: ${this.snapshot.state} -> ${event.type}`,
      );
    }

    switch (event.type) {
      case "disconnect":
        this.snapshot = {
          state: "disconnected",
          reason: event.reason,
          attempt: this.snapshot.attempt,
        };
        break;

      case "reconnect-started":
        this.snapshot = {
          ...this.snapshot,
          state: "reconnecting",
        };
        break;

      case "reconnect-succeeded":
        this.snapshot = {
          ...this.snapshot,
          state: event.requiresReauthentication ? "reauthenticating" : "resyncing",
        };
        delete this.snapshot.lastError;
        delete this.snapshot.failureCode;
        break;

      case "reconnect-failed":
        this.snapshot = {
          ...this.snapshot,
          state: "failed",
          failureCode: "reconnect-failed",
          lastError: event.error,
        };
        break;

      case "reauthentication-succeeded":
        this.snapshot = {
          ...this.snapshot,
          state: "resyncing",
        };
        delete this.snapshot.lastError;
        delete this.snapshot.failureCode;
        break;

      case "reauthentication-failed":
        this.snapshot = {
          ...this.snapshot,
          state: "failed",
          failureCode: "reauthentication-failed",
          lastError: event.error,
        };
        break;

      case "resync-succeeded":
        this.snapshot = {
          state: "connected",
          attempt: this.snapshot.attempt,
        };
        break;

      case "resync-failed":
        this.snapshot = {
          ...this.snapshot,
          state: "failed",
          failureCode: "resync-failed",
          lastError: event.error,
        };
        break;

      case "resume-failed":
        this.snapshot = {
          ...this.snapshot,
          state: "failed",
          failureCode: "resume-failed",
          lastError: event.error,
        };
        break;

      case "reset-to-connected":
        this.snapshot = {
          state: "connected",
          attempt: this.snapshot.attempt,
        };
        break;
    }

    return this.getSnapshot();
  }

  public nextReconnectAttempt(): number {
    const attempt = this.snapshot.attempt + 1;
    this.snapshot = { ...this.snapshot, attempt };
    return attempt;
  }
}
