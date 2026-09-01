import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthenticatedSessionFinalizer,
  InMemoryAuthenticatedSessionStore,
} from "../src/signal/index.js";

function auth() {
  return {
    mode: "login" as const,
    state: "accepted" as const,
    clientPayload: new Uint8Array([1, 2]),
    clientFinish: new Uint8Array([3, 4]),
    serverResponse: new Uint8Array([5]),
  };
}

function postAuth() {
  return {
    stage: "authenticated" as const,
    prekeysReady: true,
    credentialsFinalized: true,
    presenceInitialized: true,
    keyBundleValidated: true,
  };
}

function bundle() {
  return {
    identityKey: {
      publicKey: new Uint8Array(32).fill(1),
      privateKey: new Uint8Array(32).fill(2),
    },
    registrationId: 9,
    signedPreKey: {
      id: 1,
      publicKey: new Uint8Array(32).fill(3),
      privateKey: new Uint8Array(32).fill(4),
      signature: new Uint8Array(64).fill(5),
      generatedAt: 1,
    },
    preKeys: [{
      id: 2,
      publicKey: new Uint8Array(32).fill(6),
      privateKey: new Uint8Array(32).fill(7),
    }],
  };
}

test("finalizer persists an active authenticated session", async () => {
  const store = new InMemoryAuthenticatedSessionStore();
  const finalizer = new AuthenticatedSessionFinalizer(store);

  const result = await finalizer.finalize({
    sessionId: "session-1",
    authentication: auth(),
    postAuthentication: postAuth(),
    keyBundle: bundle(),
    authenticatedAt: 100,
  });

  assert.equal(result.state, "active");
  assert.equal(finalizer.state, "active");
  assert.equal(store.read()?.sessionId, "session-1");
  assert.equal(store.read()?.authenticatedAt, 100);
});

test("failed persistence prevents active state", async () => {
  const finalizer = new AuthenticatedSessionFinalizer({
    write: async () => {
      throw new Error("disk unavailable");
    },
  });

  await assert.rejects(() =>
    finalizer.finalize({
      sessionId: "session-2",
      authentication: auth(),
      postAuthentication: postAuth(),
      keyBundle: bundle(),
    }),
  );

  assert.equal(finalizer.state, "failed");
});

test("mutating caller material does not mutate persisted session", async () => {
  const store = new InMemoryAuthenticatedSessionStore();
  const finalizer = new AuthenticatedSessionFinalizer(store);
  const keys = bundle();

  await finalizer.finalize({
    sessionId: "session-3",
    authentication: auth(),
    postAuthentication: postAuth(),
    keyBundle: keys,
  });

  keys.identityKey.publicKey[0] = 99;
  assert.equal(
    store.read()!.keyBundle.identityKey.publicKey[0],
    1,
  );
});

test("unaccepted authentication cannot be finalized", async () => {
  const store = new InMemoryAuthenticatedSessionStore();
  const finalizer = new AuthenticatedSessionFinalizer(store);

  await assert.rejects(() =>
    finalizer.finalize({
      sessionId: "session-4",
      authentication: {
        ...auth(),
        state: "accepted",
      },
      postAuthentication: {
        ...postAuth(),
        stage: "accepted" as never,
      },
      keyBundle: bundle(),
    }),
  );

  assert.equal(finalizer.state, "failed");
});
