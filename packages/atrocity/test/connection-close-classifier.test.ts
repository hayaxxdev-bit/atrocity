import {
  DefaultConnectionCloseClassifier,
} from "../src/connection/recovery";

describe("DefaultConnectionCloseClassifier", () => {
  const classifier = new DefaultConnectionCloseClassifier();

  it("maps transient network failures to reconnect", () => {
    const result = classifier.classify({
      kind: "transport",
      code: "network",
      retryable: true,
    });

    expect(result.action).toBe("reconnect");
    expect(result.reason).toBe("transport-closed");
  });

  it("maps logged-out/auth failures to reauthenticate", () => {
    const result = classifier.classify({
      kind: "authentication",
      code: "logged-out",
      retryable: true,
    });

    expect(result.action).toBe("reauthenticate");
    expect(result.reason).toBe("session-invalid");
  });

  it("maps session-invalid to session repair", () => {
    const result = classifier.classify({
      kind: "session",
      code: "session-invalid",
      retryable: true,
    });

    expect(result.action).toBe("repair-session");
    expect(result.reason).toBe("session-invalid");
  });

  it("maps non-retryable protocol failures to terminal", () => {
    const result = classifier.classify({
      kind: "protocol",
      code: "protocol-error",
      retryable: false,
    });

    expect(result.action).toBe("terminal");
    expect(result.reason).toBe("protocol-failure");
  });
});
