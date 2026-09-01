import type {
  AuthenticatedSession,
} from "./authenticated-session-types.js";

export class InMemoryAuthenticatedSessionStore {
  private value?: AuthenticatedSession;

  async write(
    session: AuthenticatedSession,
  ): Promise<void> {
    this.value = clone(session);
  }

  read(): AuthenticatedSession | undefined {
    return this.value ? clone(this.value) : undefined;
  }

  clear(): void {
    this.value = undefined;
  }
}

function clone(
  value: AuthenticatedSession,
): AuthenticatedSession {
  return Object.freeze({
    ...value,
    auth: Object.freeze({
      ...value.auth,
      clientPayload: value.auth.clientPayload.slice(),
      clientFinish: value.auth.clientFinish.slice(),
      ...(value.auth.serverResponse
        ? {
            serverResponse:
              value.auth.serverResponse.slice(),
          }
        : {}),
    }),
    postAuth: Object.freeze({
      ...value.postAuth,
    }),
    keyBundle: Object.freeze({
      identityKey: Object.freeze({
        publicKey:
          value.keyBundle.identityKey.publicKey.slice(),
        privateKey:
          value.keyBundle.identityKey.privateKey.slice(),
      }),
      registrationId: value.keyBundle.registrationId,
      signedPreKey: Object.freeze({
        ...value.keyBundle.signedPreKey,
        publicKey:
          value.keyBundle.signedPreKey.publicKey.slice(),
        privateKey:
          value.keyBundle.signedPreKey.privateKey.slice(),
        signature:
          value.keyBundle.signedPreKey.signature.slice(),
      }),
      preKeys: Object.freeze(
        value.keyBundle.preKeys.map((key) =>
          Object.freeze({
            ...key,
            publicKey: key.publicKey.slice(),
            privateKey: key.privateKey.slice(),
          })),
      ),
    }),
  });
}
