import type { AuthenticationCredentials } from "../../auth/credentials/credential-types.js";
import type { SignalSessionRecord } from "../persistence/session-record.js";
import type { SignalSessionStore } from "../persistence/session-store.js";
import type {
  ServerCapabilityName,
  ServerCapabilitySet,
} from "../sync/server-capability-types.js";
import { SessionBootstrapError } from "./session-bootstrap-errors.js";
import type {
  ActiveSignalSession,
  SessionBootstrapResult,
  SessionBootstrapState,
} from "./session-bootstrap-types.js";

export type SessionBootstrapDependencies = {
  readonly loadCredentials: () => Promise<AuthenticationCredentials | undefined>;
  readonly sessionStore: SignalSessionStore;
  readonly capabilities: ServerCapabilitySet;
  readonly requiredCapabilities?: readonly ServerCapabilityName[];
};

export class SessionBootstrap {
  private stateValue: SessionBootstrapState = "no-session";
  private active?: ActiveSignalSession;

  constructor(
    private readonly dependencies: SessionBootstrapDependencies,
  ) {}

  get state(): SessionBootstrapState {
    return this.stateValue;
  }

  get activeSession(): ActiveSignalSession | undefined {
    return this.active;
  }

  async restore(
    sessionId: string,
  ): Promise<SessionBootstrapResult> {
    if (
      this.stateValue !== "no-session" &&
      this.stateValue !== "failed" &&
      this.stateValue !== "corrupt" &&
      this.stateValue !== "incompatible"
    ) {
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_INVALID_STATE",
        `Cannot restore from state ${this.stateValue}.`,
      );
    }

    this.transition("loading");

    try {
      const credentials =
        await this.dependencies.loadCredentials();

      if (!credentials) {
        this.transition("failed");
        throw new SessionBootstrapError(
          "SESSION_BOOTSTRAP_CREDENTIALS_MISSING",
          "Authentication credentials are not available.",
        );
      }

      this.transition("restoring");

      const record =
        await this.dependencies.sessionStore.load(sessionId);

      if (!record) {
        this.transition("no-session");

        return Object.freeze({
          state: "no-session",
          created: false,
        });
      }

      this.validateRecord(record);
      this.validateCapabilities();

      this.active = Object.freeze({
        sessionId,
        credentials,
        record,
        capabilities: this.dependencies.capabilities,
      });

      this.transition("validated");
      this.transition("active");

      return Object.freeze({
        state: "active",
        created: false,
        active: this.active,
      });
    } catch (error) {
      if (error instanceof SessionBootstrapError) {
        throw error;
      }

      this.transition("failed");
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_FAILED",
        `Failed to restore Signal session "${sessionId}".`,
        { cause: error },
      );
    }
  }

  async create(
    sessionId: string,
    recordFactory: (
      credentials: AuthenticationCredentials,
    ) => SignalSessionRecord,
  ): Promise<SessionBootstrapResult> {
    if (
      this.stateValue !== "no-session" &&
      this.stateValue !== "failed"
    ) {
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_INVALID_STATE",
        `Cannot create from state ${this.stateValue}.`,
      );
    }

    this.transition("loading");

    const credentials =
      await this.dependencies.loadCredentials();

    if (!credentials) {
      this.transition("failed");
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_CREDENTIALS_MISSING",
        "Authentication credentials are not available.",
      );
    }

    this.transition("restoring");
    this.validateCapabilities();

    try {
      const record = recordFactory(credentials);

      if (record.sessionId !== sessionId) {
        throw new SessionBootstrapError(
          "SESSION_BOOTSTRAP_FAILED",
          "Session record factory returned an unexpected session id.",
        );
      }

      await this.dependencies.sessionStore.save(record);

      this.active = Object.freeze({
        sessionId,
        credentials,
        record,
        capabilities: this.dependencies.capabilities,
      });

      this.transition("validated");
      this.transition("active");

      return Object.freeze({
        state: "active",
        created: true,
        active: this.active,
      });
    } catch (error) {
      if (error instanceof SessionBootstrapError) throw error;

      this.transition("failed");
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_FAILED",
        `Failed to create Signal session "${sessionId}".`,
        { cause: error },
      );
    }
  }

  clear(): void {
    this.active = undefined;

    if (this.stateValue !== "no-session") {
      this.stateValue = "no-session";
    }
  }

  private validateRecord(record: SignalSessionRecord): void {
    if (record.schemaVersion !== 1) {
      this.stateValue = "incompatible";
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_INCOMPATIBLE",
        `Unsupported Signal session schema ${record.schemaVersion}.`,
      );
    }

    if (
      !record.sessionId ||
      record.skippedMessageKeys.length > 100_000
    ) {
      this.stateValue = "corrupt";
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_CORRUPT",
        "Persisted Signal session failed bootstrap validation.",
      );
    }

    if (record.updatedAt < record.createdAt) {
      this.stateValue = "corrupt";
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_CORRUPT",
        "Session updatedAt precedes createdAt.",
      );
    }
  }

  private validateCapabilities(): void {
    const required =
      this.dependencies.requiredCapabilities ?? [];

    const missing = required.filter(
      (name) => !this.dependencies.capabilities[name]?.supported,
    );

    if (missing.length > 0) {
      this.stateValue = "incompatible";

      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_INCOMPATIBLE",
        `Server does not support required session capabilities: ${missing.join(", ")}.`,
      );
    }
  }

  private transition(next: SessionBootstrapState): void {
    const allowed: Record<
      SessionBootstrapState,
      readonly SessionBootstrapState[]
    > = {
      "no-session": ["loading"],
      loading: ["restoring", "failed"],
      restoring: ["validated", "no-session", "corrupt", "incompatible", "failed"],
      validated: ["active", "failed"],
      active: ["no-session"],
      corrupt: ["loading", "no-session"],
      incompatible: ["loading", "no-session"],
      failed: ["loading", "no-session"],
    };

    if (!allowed[this.stateValue].includes(next)) {
      throw new SessionBootstrapError(
        "SESSION_BOOTSTRAP_INVALID_STATE",
        `Invalid session bootstrap transition ${this.stateValue} → ${next}.`,
      );
    }

    this.stateValue = next;
  }
}
