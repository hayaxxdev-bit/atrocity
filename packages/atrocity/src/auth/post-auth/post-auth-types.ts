export type PostAuthenticationStage =
  | "accepted"
  | "initializing"
  | "prekeys-ready"
  | "credentials-finalized"
  | "presence-initialized"
  | "key-bundle-validated"
  | "authenticated"
  | "failed";

export type PostAuthenticationResult = {
  readonly stage: "authenticated";
  readonly prekeysReady: boolean;
  readonly credentialsFinalized: boolean;
  readonly presenceInitialized: boolean;
  readonly keyBundleValidated: boolean;
};
