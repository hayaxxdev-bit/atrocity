import {
  ConnectionRecoveryRouter,
  DefaultConnectionCloseClassifier,
} from "../src/connection/recovery";

describe("ConnectionRecoveryRouter", () => {
  it("routes each classification to exactly one boundary", async () => {
    const calls: string[] = [];

    const router = new ConnectionRecoveryRouter(
      new DefaultConnectionCloseClassifier(),
      {
        reconnect: async () => calls.push("reconnect"),
        reauthenticate: async () => calls.push("reauthenticate"),
        repairSession: async () => calls.push("repair-session"),
        terminal: async () => calls.push("terminal"),
      },
    );

    const action = await router.route({
      kind: "stream",
      code: "stream-closed",
      retryable: true,
    });

    expect(action).toBe("reconnect");
    expect(calls).toEqual(["reconnect"]);
  });

  it("does not call unrelated handlers", async () => {
    const calls: string[] = [];

    const router = new ConnectionRecoveryRouter(
      new DefaultConnectionCloseClassifier(),
      {
        reconnect: async () => calls.push("reconnect"),
        reauthenticate: async () => calls.push("reauthenticate"),
        repairSession: async () => calls.push("repair"),
        terminal: async () => calls.push("terminal"),
      },
    );

    await router.route({
      kind: "session",
      code: "session-invalid",
      retryable: true,
    });

    expect(calls).toEqual(["repair"]);
  });
});
