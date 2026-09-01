import { ConnectionRecoveryError } from "./connection-recovery-errors.js";
import { ConnectionRecoveryStateMachine } from "./connection-recovery-state-machine.js";
import type {
  ConnectionRecoveryDependencies,
  ConnectionRecoveryReason,
  ConnectionRecoveryResult,
} from "./connection-recovery-types.js";

export class ConnectionRecoveryCoordinator {
  private recovering = false;

  constructor(
    private readonly machine: ConnectionRecoveryStateMachine,
    private readonly dependencies: ConnectionRecoveryDependencies,
  ) {}

  public get snapshot() {
    return this.machine.getSnapshot();
  }

  public async recover(
    reason: ConnectionRecoveryReason,
  ): Promise<ConnectionRecoveryResult> {
    if (this.recovering) {
      throw new ConnectionRecoveryError("Connection recovery is already in progress.");
    }

    if (this.snapshot.state === "failed") {
      throw new ConnectionRecoveryError(
        "Recovery cannot start from failed state; reset the recovery state first.",
      );
    }

    this.recovering = true;
    this.machine.dispatch({ type: "disconnect", reason });

    try {
      this.machine.dispatch({ type: "reconnect-started" });
      const attempt = this.machine.nextReconnectAttempt();
      await this.dependencies.reconnectTransport(attempt);
      this.machine.dispatch({
        type: "reconnect-succeeded",
        requiresReauthentication: reason === "session-invalid",
      });

      if (reason === "session-invalid") {
        try {
          await this.dependencies.reauthenticate();
          this.machine.dispatch({ type: "reauthentication-succeeded" });
        } catch (error) {
          this.machine.dispatch({
            type: "reauthentication-failed",
            error,
          });
          return {
            status: "failed",
            snapshot: this.snapshot,
          };
        }
      }

      try {
        await this.dependencies.resync();
      } catch (error) {
        this.machine.dispatch({ type: "resync-failed", error });
        return {
          status: "failed",
          snapshot: this.snapshot,
        };
      }

      try {
        await this.dependencies.resumePendingMessages();
      } catch (error) {
        this.machine.dispatch({ type: "resume-failed", error });
        return {
          status: "failed",
          snapshot: this.snapshot,
        };
      }

      this.machine.dispatch({ type: "resync-succeeded" });

      return {
        status: "recovered",
        snapshot: this.snapshot,
      };
    } catch (error) {
      this.machine.dispatch({
        type: "reconnect-failed",
        error,
      });

      return {
        status: "failed",
        snapshot: this.snapshot,
      };
    } finally {
      this.recovering = false;
    }
  }

  public reset(): void {
    if (this.recovering) {
      throw new ConnectionRecoveryError(
        "Cannot reset recovery state while recovery is running.",
      );
    }

    this.machine.dispatch({ type: "reset-to-connected" });
  }
}
