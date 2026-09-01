import {
  ConstantReconnectPolicy,
  PolicyReconnectScheduler,
  ReconnectExecutorImpl,
} from "../src/connection/recovery";

describe("ReconnectExecutorImpl", () => {
  it("retries until connection succeeds and resets policy", async () => {
    const attempts: number[] = [];
    let calls = 0;

    const policy = new ConstantReconnectPolicy({
      strategy: "constant",
      initialDelayMs: 1,
      maxDelayMs: 1,
      maxAttempts: 5,
      multiplier: 1,
      jitter: "none",
    });

    const scheduler = new PolicyReconnectScheduler(policy, async () => {});

    const executor = new ReconnectExecutorImpl({
      policy,
      scheduler,
      connect: async () => {
        calls += 1;
        attempts.push(calls);
        if (calls < 3) {
          throw new Error("offline");
        }
      },
    });

    const result = await executor.run();

    expect(result).toEqual({ attempts: 3, recovered: true });
    expect(attempts).toEqual([1, 2, 3]);
    expect(policy.snapshot().attempt).toBe(0);
  });

  it("stops at maxAttempts", async () => {
    const policy = new ConstantReconnectPolicy({
      strategy: "constant",
      initialDelayMs: 1,
      maxDelayMs: 1,
      maxAttempts: 3,
      multiplier: 1,
      jitter: "none",
    });

    const scheduler = new PolicyReconnectScheduler(policy, async () => {});
    let calls = 0;

    const executor = new ReconnectExecutorImpl({
      policy,
      scheduler,
      connect: async () => {
        calls += 1;
        throw new Error("offline");
      },
    });

    const result = await executor.run();

    expect(result).toEqual({ attempts: 3, recovered: false });
    expect(calls).toBe(3);
  });
});
