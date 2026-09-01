import {
  ConnectionRecoveryCoordinator,
  ConnectionRecoveryStateMachine,
} from "../src/connection/recovery/index.js";

describe("ConnectionRecoveryCoordinator", () => {
  it("recovers a transport disconnect without reauthentication", async () => {
    const calls: string[] = [];
    const coordinator = new ConnectionRecoveryCoordinator(
      new ConnectionRecoveryStateMachine(),
      {
        reconnectTransport: async () => {
          calls.push("reconnect");
        },
        reauthenticate: async () => {
          calls.push("reauthenticate");
        },
        resync: async () => {
          calls.push("resync");
        },
        resumePendingMessages: async () => {
          calls.push("resume");
        },
      },
    );

    const result = await coordinator.recover("transport-closed");

    expect(result.status).toBe("recovered");
    expect(coordinator.snapshot.state).toBe("connected");
    expect(calls).toEqual(["reconnect", "resync", "resume"]);
  });

  it("reauthenticates before resync when the session is invalid", async () => {
    const calls: string[] = [];
    const coordinator = new ConnectionRecoveryCoordinator(
      new ConnectionRecoveryStateMachine(),
      {
        reconnectTransport: async () => { calls.push("reconnect"); },
        reauthenticate: async () => { calls.push("reauthenticate"); },
        resync: async () => { calls.push("resync"); },
        resumePendingMessages: async () => { calls.push("resume"); },
      },
    );

    const result = await coordinator.recover("session-invalid");

    expect(result.status).toBe("recovered");
    expect(calls).toEqual([
      "reconnect",
      "reauthenticate",
      "resync",
      "resume",
    ]);
  });

  it("distinguishes resume failure from resync failure", async () => {
    const coordinator = new ConnectionRecoveryCoordinator(
      new ConnectionRecoveryStateMachine(),
      {
        reconnectTransport: async () => {},
        reauthenticate: async () => {},
        resync: async () => {},
        resumePendingMessages: async () => {
          throw new Error("resume failed");
        },
      },
    );

    const result = await coordinator.recover("transport-closed");

    expect(result.status).toBe("failed");
    expect(result.snapshot.failureCode).toBe("resume-failed");
  });

  it("does not report recovery when resync fails", async () => {
    const coordinator = new ConnectionRecoveryCoordinator(
      new ConnectionRecoveryStateMachine(),
      {
        reconnectTransport: async () => {},
        reauthenticate: async () => {},
        resync: async () => {
          throw new Error("repair failed");
        },
        resumePendingMessages: async () => {},
      },
    );

    const result = await coordinator.recover("stream-closed");

    expect(result.status).toBe("failed");
    expect(result.snapshot.state).toBe("failed");
    expect(result.snapshot.failureCode).toBe("resync-failed");
  });

  it("does not allow concurrent recovery", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });

    const coordinator = new ConnectionRecoveryCoordinator(
      new ConnectionRecoveryStateMachine(),
      {
        reconnectTransport: async () => pending,
        reauthenticate: async () => {},
        resync: async () => {},
        resumePendingMessages: async () => {},
      },
    );

    const first = coordinator.recover("transport-closed");

    await expect(
      coordinator.recover("stream-closed"),
    ).rejects.toThrow(/already in progress/);

    release();
    await first;
  });
});
