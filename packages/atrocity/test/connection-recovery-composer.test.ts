import {
  ConnectionRecoveryComposer,
  DefaultConnectionCloseClassifier,
} from "../src/connection/recovery";

describe("ConnectionRecoveryComposer", () => {
  it("classifies and executes the selected action only", async () => {
    const calls: string[] = [];

    const composer = new ConnectionRecoveryComposer(
      new DefaultConnectionCloseClassifier(),
      {
        reconnect: async () => {
          calls.push("reconnect");
          return true;
        },
        reauthenticate: async () => {
          calls.push("reauthenticate");
          return true;
        },
        repairSession: async () => {
          calls.push("repair");
          return true;
        },
        terminal: async () => {
          calls.push("terminal");
          return false;
        },
      },
    );

    const result = await composer.recover({
      kind: "transport",
      code: "network",
      retryable: true,
    });

    expect(result.action).toBe("reconnect");
    expect(result.recovered).toBe(true);
    expect(calls).toEqual(["reconnect"]);
  });

  it("returns terminal=false without invoking retry paths", async () => {
    const calls: string[] = [];

    const composer = new ConnectionRecoveryComposer(
      new DefaultConnectionCloseClassifier(),
      {
        reconnect: async () => {
          calls.push("reconnect");
          return true;
        },
        reauthenticate: async () => {
          calls.push("reauthenticate");
          return true;
        },
        repairSession: async () => {
          calls.push("repair");
          return true;
        },
        terminal: async () => {
          calls.push("terminal");
          return false;
        },
      },
    );

    const result = await composer.recover({
      kind: "protocol",
      code: "protocol-error",
      retryable: false,
    });

    expect(result.action).toBe("terminal");
    expect(result.recovered).toBe(false);
    expect(calls).toEqual(["terminal"]);
  });

  it("prevents overlapping composition", async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => {
      release = resolve;
    });

    const composer = new ConnectionRecoveryComposer(
      new DefaultConnectionCloseClassifier(),
      {
        reconnect: async () => {
          await pending;
          return true;
        },
        reauthenticate: async () => true,
        repairSession: async () => true,
        terminal: async () => false,
      },
    );

    const first = composer.recover({
      kind: "transport",
      code: "network",
      retryable: true,
    });

    await expect(
      composer.recover({
        kind: "transport",
        code: "timeout",
        retryable: true,
      }),
    ).rejects.toThrow(/already running/);

    release();
    await first;
  });
});
