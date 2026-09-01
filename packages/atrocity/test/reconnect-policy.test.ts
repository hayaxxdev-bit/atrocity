import {
  ConstantReconnectPolicy,
  ExponentialReconnectPolicy,
  LinearReconnectPolicy,
} from "../src/connection/recovery";

describe("reconnect policies", () => {
  it("caps exponential delay", () => {
    const policy = new ExponentialReconnectPolicy({
      strategy: "exponential",
      initialDelayMs: 100,
      maxDelayMs: 500,
      maxAttempts: 10,
      multiplier: 2,
      jitter: "none",
    });

    expect(policy.next(1).delayMs).toBe(100);
    expect(policy.next(2).delayMs).toBe(200);
    expect(policy.next(3).delayMs).toBe(400);
    expect(policy.next(4).delayMs).toBe(500);
  });

  it("produces linear delays", () => {
    const policy = new LinearReconnectPolicy({
      strategy: "linear",
      initialDelayMs: 100,
      maxDelayMs: 450,
      multiplier: 1,
      jitter: "none",
    });

    expect(policy.next(1).delayMs).toBe(100);
    expect(policy.next(2).delayMs).toBe(200);
    expect(policy.next(3).delayMs).toBe(300);
    expect(policy.next(5).delayMs).toBe(450);
  });

  it("produces constant delays", () => {
    const policy = new ConstantReconnectPolicy({
      strategy: "constant",
      initialDelayMs: 250,
      maxDelayMs: 500,
      multiplier: 1,
      jitter: "none",
    });

    expect(policy.next(1).delayMs).toBe(250);
    expect(policy.next(5).delayMs).toBe(250);
  });

  it("honors maxAttempts", () => {
    const policy = new ExponentialReconnectPolicy({
      strategy: "exponential",
      initialDelayMs: 10,
      maxDelayMs: 100,
      maxAttempts: 2,
      multiplier: 2,
      jitter: "none",
    });

    expect(policy.isExhausted(1)).toBe(false);
    expect(policy.isExhausted(2)).toBe(false);
    expect(policy.isExhausted(3)).toBe(true);
  });
});
