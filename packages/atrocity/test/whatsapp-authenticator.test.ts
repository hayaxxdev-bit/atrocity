import assert from "node:assert/strict";
import test from "node:test";
import {
  WhatsAppAuthenticator,
} from "../src/connection/index.js";

function makeDependencies(
  order: string[],
  credentials?: object,
) {
  const creds = credentials ?? {
    device: {
      deviceId: new Uint8Array([1]),
      registrationId: 1,
      identityKeyPublic: new Uint8Array(32),
      identityKeyPrivate: new Uint8Array(32),
    },
    identitySigningKey: {
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
    },
    signedPreKey: {
      keyId: 1,
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
      signature: new Uint8Array(64),
      generatedAt: 1,
    },
    registrationId: 1,
  };

  const noise = {
    ephemeralPublicKey: new Uint8Array(32).fill(1),
    encryptAndHash: (data: Uint8Array) => {
      order.push("encrypt");
      return data.slice();
    },
  };

  return {
    state: {
      loadCredentials: async () => creds,
    } as never,
    createNoiseState: () => noise as never,
    encodeHandshake: (message: any) => {
      order.push(message.type);
      return new Uint8Array([message.type === "clientHello" ? 1 : 2]);
    },
    decodeHandshake: () => ({
      type: "serverHello",
      serverHello: {
        ephemeral: new Uint8Array(32),
      },
    }),
    processServerHello: (_message: any, _noise: any) => {
      order.push("process-noise");
      return {
        encryptedStatic: new Uint8Array([21, 22, 23]),
      };
    },
    sendRaw: async () => {
      order.push("send");
    },
    receiveRaw: async () => {
      order.push("receive");
      return new Uint8Array([9]);
    },
    buildLoginPayload: async () => {
      order.push("login-payload");
      return new Uint8Array([3]);
    },
    buildRegistrationPayload: async () => {
      order.push("registration-payload");
      return new Uint8Array([4]);
    },
    finishNoise: async () => {
      order.push("finish-noise");
    },
    persistAuthenticatedState: async () => {
      order.push("persist");
    },
  };
}

test("login orchestration follows the target handshake lifecycle", async () => {
  const order: string[] = [];
  const auth = new WhatsAppAuthenticator(makeDependencies(order));

  await auth.authenticate("login");

  assert.equal(auth.stage, "authenticated");
  assert.deepEqual(order, [
    "clientHello",
    "send",
    "receive",
    "process-noise",
    "login-payload",
    "encrypt",
    "clientFinish",
    "send",
    "finish-noise",
    "persist",
  ]);
});

test("registration mode selects registration payload builder", async () => {
  const order: string[] = [];
  const auth = new WhatsAppAuthenticator(makeDependencies(order));

  await auth.authenticate("registration");

  assert.equal(auth.stage, "authenticated");
  assert.equal(order.includes("registration-payload"), true);
  assert.equal(order.includes("login-payload"), false);
});

test("missing credentials fails before noise initialization", async () => {
  let noiseCreated = false;
  const deps = makeDependencies([]);
  deps.state.loadCredentials = async () => undefined;
  deps.createNoiseState = () => {
    noiseCreated = true;
    return {} as never;
  };

  const auth = new WhatsAppAuthenticator(deps);

  await assert.rejects(() => auth.authenticate("login"));
  assert.equal(noiseCreated, false);
  assert.equal(auth.stage, "failed");
});
