import { PostAuthenticationError } from "./post-auth-errors.js";
import type {
  PostAuthenticationResult,
  PostAuthenticationStage,
} from "./post-auth-types.js";

export type PostAuthenticationDependencies = {
  readonly ensurePreKeys: () => Promise<void>;
  readonly finalizeCredentials: () => Promise<void>;
  readonly initializePresence: () => Promise<void>;
  readonly validateKeyBundle: () => Promise<void>;
};

export class PostAuthenticationInitializer {
  private stageValue: PostAuthenticationStage = "accepted";

  constructor(
    private readonly dependencies: PostAuthenticationDependencies,
  ) {}

  get stage(): PostAuthenticationStage {
    return this.stageValue;
  }

  async run(): Promise<PostAuthenticationResult> {
    this.require("accepted");
    this.stageValue = "initializing";

    try {
      await this.runStep(
        "prekeys-ready",
        "POST_AUTH_PREKEY_FAILED",
        "Failed to establish pre-key readiness.",
        this.dependencies.ensurePreKeys,
      );

      await this.runStep(
        "credentials-finalized",
        "POST_AUTH_CREDENTIALS_FAILED",
        "Failed to finalize authenticated credentials.",
        this.dependencies.finalizeCredentials,
      );

      await this.runStep(
        "presence-initialized",
        "POST_AUTH_PRESENCE_FAILED",
        "Failed to initialize online/passive presence state.",
        this.dependencies.initializePresence,
      );

      await this.runStep(
        "key-bundle-validated",
        "POST_AUTH_KEY_BUNDLE_FAILED",
        "Failed to validate the server-side key bundle.",
        this.dependencies.validateKeyBundle,
      );

      this.stageValue = "authenticated";

      return Object.freeze({
        stage: "authenticated",
        prekeysReady: true,
        credentialsFinalized: true,
        presenceInitialized: true,
        keyBundleValidated: true,
      });
    } catch (error) {
      this.stageValue = "failed";

      if (error instanceof PostAuthenticationError) {
        throw error;
      }

      throw new PostAuthenticationError(
        "POST_AUTH_FAILED",
        "Post-authentication initialization failed.",
        { cause: error },
      );
    }
  }

  private async runStep(
    next: Extract<
      PostAuthenticationStage,
      "prekeys-ready" |
      "credentials-finalized" |
      "presence-initialized" |
      "key-bundle-validated"
    >,
    code: "POST_AUTH_PREKEY_FAILED" | "POST_AUTH_CREDENTIALS_FAILED" | "POST_AUTH_PRESENCE_FAILED" | "POST_AUTH_KEY_BUNDLE_FAILED",
    message: string,
    operation: () => Promise<void>,
  ): Promise<void> {
    try {
      await operation();
      this.stageValue = next;
    } catch (error) {
      throw new PostAuthenticationError(
        code,
        message,
        { cause: error },
      );
    }
  }

  private require(expected: PostAuthenticationStage): void {
    if (this.stageValue !== expected) {
      throw new PostAuthenticationError(
        "POST_AUTH_INVALID_STATE",
        `Expected post-auth stage ${expected}, current stage is ${this.stageValue}.`,
      );
    }
  }
}
