import type { AuthenticationExchangeResult } from "../../auth/exchange/index.js";
import type { PostAuthenticationResult } from "../../auth/post-auth/index.js";
import type { SignalKeyBundle } from "../key-bundle/index.js";
import {
  AuthenticatedSessionError,
} from "./authenticated-session-errors.js";
import type {
  AuthenticatedSession,
  AuthenticatedSessionFinalizeResult,
  AuthenticatedSessionState,
} from "./authenticated-session-types.js";

export type AuthenticatedSessionWriter = {
  readonly write: (
    session: AuthenticatedSession,
  ) => Promise<void>;
};

export type AuthenticatedSessionFinalizeInput = {
  readonly sessionId: string;
  readonly authentication: AuthenticationExchangeResult;
  readonly postAuthentication: PostAuthenticationResult;
  readonly keyBundle: SignalKeyBundle;
  readonly authenticatedAt?: number;
};

export class AuthenticatedSessionFinalizer {
  private stateValue: AuthenticatedSessionState = "authenticated";

  constructor(
    private readonly writer: AuthenticatedSessionWriter,
  ) {}

  get state(): AuthenticatedSessionState {
    return this.stateValue;
  }

  async finalize(
    input: AuthenticatedSessionFinalizeInput,
  ): Promise<AuthenticatedSessionFinalizeResult> {
    this.require("authenticated");
    validateInput(input);

    this.stateValue = "finalizing";

    if (
      input.postAuthentication.stage !==
      "authenticated"
    ) {
      this.stateValue = "failed";
      throw new AuthenticatedSessionError(
        "AUTH_SESSION_INVALID_INPUT",
        "Post-authentication state is not authenticated.",
      );
    }

    this.stateValue = "persisting";

    const session: AuthenticatedSession = Object.freeze({
      sessionId: input.sessionId,
      authenticatedAt:
        input.authenticatedAt ?? Date.now(),
      auth: cloneAuth(input.authentication),
      postAuth: Object.freeze({
        ...input.postAuthentication,
      }),
      keyBundle: cloneBundle(input.keyBundle),
    });

    try {
      await this.writer.write(session);
    } catch (error) {
      this.stateValue = "failed";

      throw new AuthenticatedSessionError(
        "AUTH_SESSION_PERSIST_FAILED",
        "Failed to persist authenticated session.",
        { cause: error },
      );
    }

    this.stateValue = "active";

    return Object.freeze({
      state: "active",
      session,
    });
  }

  private require(
    expected: AuthenticatedSessionState,
  ): void {
    if (this.stateValue !== expected) {
      throw new AuthenticatedSessionError(
        "AUTH_SESSION_INVALID_STATE",
        `Expected session finalizer state ${expected}, current state is ${this.stateValue}.`,
      );
    }
  }
}

function validateInput(
  input: AuthenticatedSessionFinalizeInput,
): void {
  if (!input.sessionId) {
    throw new AuthenticatedSessionError(
      "AUTH_SESSION_INVALID_INPUT",
      "Authenticated session requires a sessionId.",
    );
  }

  if (input.authentication.state !== "accepted") {
    throw new AuthenticatedSessionError(
      "AUTH_SESSION_INVALID_INPUT",
      "Authentication exchange must be accepted before finalization.",
    );
  }

  if (input.postAuthentication.stage !== "authenticated") {
    throw new AuthenticatedSessionError(
      "AUTH_SESSION_INVALID_INPUT",
      "Post-authentication must be complete before finalization.",
    );
  }
}

function cloneAuth(
  value: AuthenticationExchangeResult,
): AuthenticationExchangeResult {
  return Object.freeze({
    ...value,
    clientPayload: value.clientPayload.slice(),
    clientFinish: value.clientFinish.slice(),
    ...(value.serverResponse
      ? { serverResponse: value.serverResponse.slice() }
      : {}),
  });
}

function cloneBundle(
  value: SignalKeyBundle,
): SignalKeyBundle {
  return Object.freeze({
    identityKey: Object.freeze({
      publicKey: value.identityKey.publicKey.slice(),
      privateKey: value.identityKey.privateKey.slice(),
    }),
    registrationId: value.registrationId,
    signedPreKey: Object.freeze({
      ...value.signedPreKey,
      publicKey: value.signedPreKey.publicKey.slice(),
      privateKey: value.signedPreKey.privateKey.slice(),
      signature: value.signedPreKey.signature.slice(),
    }),
    preKeys: Object.freeze(
      value.preKeys.map((preKey) =>
        Object.freeze({
          ...preKey,
          publicKey: preKey.publicKey.slice(),
          privateKey: preKey.privateKey.slice(),
        }),
      ),
    ),
  });
}
