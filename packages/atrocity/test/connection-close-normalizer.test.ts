import {
  DefaultConnectionCloseNormalizer,
} from "../src/connection/recovery";

describe("DefaultConnectionCloseNormalizer", () => {
  const normalizer = new DefaultConnectionCloseNormalizer();

  it("normalizes common transport error codes", () => {
    const result = normalizer.fromUnknown(
      Object.assign(new Error("connection reset"), {
        code: "ECONNRESET",
      }),
    );

    expect(result.kind).toBe("transport");
    expect(result.code).toBe("network");
    expect(result.retryable).toBe(true);
  });

  it("supports explicit fallback classification", () => {
    const result = normalizer.fromUnknown(
      new Error("custom close"),
      {
        kind: "session",
        code: "session-invalid",
        retryable: true,
      },
    );

    expect(result.kind).toBe("session");
    expect(result.code).toBe("session-invalid");
    expect(result.retryable).toBe(true);
  });
});
