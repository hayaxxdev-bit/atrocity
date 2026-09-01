import type {
  ConnectionCloseSignal,
  ConnectionFailureCode,
  ConnectionFailureKind,
} from "./connection-close-types";

const CODE_ALIASES: Record<string, ConnectionFailureCode> = {
  ECONNRESET: "network",
  ECONNREFUSED: "network",
  ETIMEDOUT: "timeout",
  EPIPE: "network",
  ENETDOWN: "network",
  ENETUNREACH: "network",
  "stream:closed": "stream-closed",
  "logged-out": "logged-out",
  "bad-auth": "bad-auth",
  "session-invalid": "session-invalid",
  "protocol-error": "protocol-error",
  "server-shutdown": "server-shutdown",
  conflict: "conflict",
};

export type ConnectionCloseNormalizer = {
  fromUnknown(
    error: unknown,
    fallback?: Partial<ConnectionCloseSignal>,
  ): ConnectionCloseSignal;
};

export class DefaultConnectionCloseNormalizer
  implements ConnectionCloseNormalizer
{
  public fromUnknown(
    error: unknown,
    fallback: Partial<ConnectionCloseSignal> = {},
  ): ConnectionCloseSignal {
    const object =
      typeof error === "object" && error !== null
        ? (error as Record<string, unknown>)
        : undefined;

    const rawCode =
      typeof object?.code === "string"
        ? object.code
        : typeof object?.reason === "string"
          ? object.reason
          : undefined;

    const code =
      (rawCode && CODE_ALIASES[rawCode]) ??
      fallback.code ??
      "unknown";

    const kind =
      fallback.kind ??
      inferKind(code);

    const retryable =
      fallback.retryable ??
      inferRetryable(code);

    const message =
      typeof object?.message === "string"
        ? object.message
        : error instanceof Error
          ? error.message
          : undefined;

    return {
      kind,
      code,
      retryable,
      message,
      cause: error,
    };
  }
}

function inferKind(code: ConnectionFailureCode): ConnectionFailureKind {
  switch (code) {
    case "network":
    case "timeout":
    case "server-shutdown":
      return "transport";

    case "stream-closed":
      return "stream";

    case "logged-out":
    case "bad-auth":
      return "authentication";

    case "session-invalid":
      return "session";

    case "protocol-error":
      return "protocol";

    case "conflict":
    case "unknown":
    default:
      return "unknown";
  }
}

function inferRetryable(code: ConnectionFailureCode): boolean {
  switch (code) {
    case "network":
    case "timeout":
    case "stream-closed":
    case "server-shutdown":
    case "session-invalid":
      return true;

    case "logged-out":
    case "bad-auth":
    case "protocol-error":
    case "conflict":
    case "unknown":
    default:
      return false;
  }
}
