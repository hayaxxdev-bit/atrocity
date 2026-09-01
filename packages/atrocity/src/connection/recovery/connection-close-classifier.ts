import type {
  ClassifiedConnectionFailure,
  ConnectionCloseSignal,
  ConnectionRecoveryAction,
} from "./connection-close-types";

export type ConnectionCloseClassifier = {
  classify(signal: ConnectionCloseSignal): ClassifiedConnectionFailure;
};

export class DefaultConnectionCloseClassifier implements ConnectionCloseClassifier {
  public classify(
    signal: ConnectionCloseSignal,
  ): ClassifiedConnectionFailure {
    const action = this.resolveAction(signal);

    switch (action) {
      case "reconnect":
        return {
          action,
          reason:
            signal.kind === "stream"
              ? "stream-closed"
              : "transport-closed",
          signal,
        };

      case "reauthenticate":
        return {
          action,
          reason: "session-invalid",
          signal,
        };

      case "repair-session":
        return {
          action,
          reason: "session-invalid",
          signal,
        };

      case "terminal":
        return {
          action,
          reason:
            signal.kind === "protocol"
              ? "protocol-failure"
              : "terminal",
          signal,
        };
    }
  }

  private resolveAction(
    signal: ConnectionCloseSignal,
  ): ConnectionRecoveryAction {
    if (!signal.retryable) {
      return "terminal";
    }

    if (
      signal.code === "logged-out" ||
      signal.code === "bad-auth"
    ) {
      return "reauthenticate";
    }

    if (signal.code === "session-invalid") {
      return "repair-session";
    }

    if (
      signal.kind === "transport" ||
      signal.kind === "stream" ||
      signal.code === "network" ||
      signal.code === "timeout" ||
      signal.code === "server-shutdown"
    ) {
      return "reconnect";
    }

    if (signal.kind === "authentication") {
      return "reauthenticate";
    }

    if (signal.kind === "session") {
      return "repair-session";
    }

    if (signal.kind === "protocol") {
      return "terminal";
    }

    return "terminal";
  }
}
