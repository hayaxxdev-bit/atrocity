import type { AuthenticationCredentials } from "../credentials/credential-types.js";

export const CREDENTIAL_RECORD_VERSION = 1;

export type CredentialRecord = {
  readonly schemaVersion: 1;
  readonly credentials: AuthenticationCredentials;
  readonly updatedAt: number;
};
