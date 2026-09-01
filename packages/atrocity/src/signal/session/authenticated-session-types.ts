import type { AuthenticationExchangeResult } from "../../auth/exchange/index.js";
import type { PostAuthenticationResult } from "../../auth/post-auth/index.js";
import type { SignalKeyBundle } from "../key-bundle/index.js";

export type AuthenticatedSessionState =
  | "authenticated"
  | "finalizing"
  | "persisting"
  | "active"
  | "failed";

export type AuthenticatedSession = {
  readonly sessionId: string;
  readonly authenticatedAt: number;
  readonly auth: AuthenticationExchangeResult;
  readonly postAuth: PostAuthenticationResult;
  readonly keyBundle: SignalKeyBundle;
};

export type AuthenticatedSessionFinalizeResult = {
  readonly state: "active";
  readonly session: AuthenticatedSession;
};
