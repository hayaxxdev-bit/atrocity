import {
  ConnectionRecoveryStateMachine,
} from "../src/connection/recovery/index.js";

describe("ConnectionRecoveryStateMachine", () => {
  it("moves disconnected -> reconnecting lifecycle into resyncing", () => {
    const machine = new ConnectionRecoveryStateMachine();

    machine.dispatch({
      type: "disconnect",
      reason: "transport-closed",
    });

    expect(machine.getSnapshot().state).toBe("disconnected");

    machine.dispatch({ type: "reconnect-started" });
    expect(machine.getSnapshot().state).toBe("reconnecting");
    machine.dispatch({ type: "reconnect-succeeded" });

    expect(machine.getSnapshot().state).toBe("resyncing");
  });

  it("requires reauthentication for an invalid session", () => {
    const machine = new ConnectionRecoveryStateMachine();

    machine.dispatch({
      type: "disconnect",
      reason: "session-invalid",
    });

    machine.dispatch({ type: "reconnect-started" });
    machine.dispatch({ type: "reconnect-succeeded", requiresReauthentication: true });

    expect(machine.getSnapshot().state).toBe("reauthenticating");

    machine.dispatch({ type: "reauthentication-succeeded" });

    expect(machine.getSnapshot().state).toBe("resyncing");
  });

  it("enters failed on reconnect failure", () => {
    const machine = new ConnectionRecoveryStateMachine();

    machine.dispatch({
      type: "disconnect",
      reason: "stream-closed",
    });

    machine.dispatch({ type: "reconnect-started" });
    machine.dispatch({
      type: "reconnect-failed",
      error: new Error("network"),
    });

    expect(machine.getSnapshot().state).toBe("failed");
    expect(machine.getSnapshot().failureCode).toBe("reconnect-failed");
  });

  it("rejects invalid transitions", () => {
    const machine = new ConnectionRecoveryStateMachine();

    expect(() => {
      machine.dispatch({ type: "resync-succeeded" });
    }).toThrow(/Invalid recovery transition/);
  });
});
