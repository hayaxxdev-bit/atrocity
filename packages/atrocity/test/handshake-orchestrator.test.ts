import assert from "node:assert/strict";
import test from "node:test";
import { HandshakeMessageCodec } from "../src/protocol/handshake/index.js";
import {
  HandshakeOrchestrator,
} from "../src/connection/index.js";
import { createTransportPair, type Transport } from "../src/transport/index.js";

const noopNoise = {
  complete: false,
} as never;

test("orchestrator follows clientHello → serverHello → clientFinish", async () => {
  const [client, server] = createTransportPair();

  const codec = new HandshakeMessageCodec();
  const order: string[] = [];

  server.setHandlers({
    onData: async (data) => {
      const message = codec.decode(data);
      order.push(message.type);

      if (message.type === "clientHello") {
        await server.send(codec.encode({
          type: "serverHello",
          serverHello: {
            ephemeral: new Uint8Array([9, 8, 7]),
            payload: new Uint8Array([6, 5, 4]),
          },
        }));
      }
    },
  });

  const noise = {
    complete: false,
    ephemeralKey: {
      publicKey: new Uint8Array([1, 2, 3]),
      privateKey: new Uint8Array(32),
    },
  } as never;

  const orchestrator = new HandshakeOrchestrator({
    transport: client,
    noise,
    handshakeCodec: codec,
    clientHelloFactory: () => ({
      type: "clientHello",
      clientHello: {
        ephemeral: new Uint8Array([1, 2, 3]),
      },
    }),
    handleServerHello: async () => {
      order.push("process-serverHello");
    },
    createClientPayload: () => new Uint8Array([10, 11]),
    encryptPayload: (_state, payload) => {
      order.push("encrypt-payload");
      return payload;
    },
    encryptStatic: () => new Uint8Array([12, 13]),
    clientFinishFactory: (_state, encryptedStatic, encryptedPayload) => ({
      type: "clientFinish",
      clientFinish: {
        static: encryptedStatic,
        payload: encryptedPayload,
      },
    }),
  });

  await Promise.all([
    server.connect(),
    orchestrator.run(),
  ]);

  assert.equal(orchestrator.stage, "complete");
  assert.deepEqual(order, [
    "clientHello",
    "serverHello",
    "process-serverHello",
    "encrypt-payload",
    "clientFinish",
  ]);
});

test("orchestrator rejects a non-serverHello response", async () => {
  const [client, server] = createTransportPair();
  const codec = new HandshakeMessageCodec();

  server.setHandlers({
    onData: async () => {
      await server.send(codec.encode({
        type: "clientHello",
        clientHello: {
          ephemeral: new Uint8Array([1]),
        },
      }));
    },
  });

  const dependencies = {
    transport: client,
    noise: { complete: false } as never,
    handshakeCodec: codec,
    clientHelloFactory: () => ({
      type: "clientHello",
      clientHello: { ephemeral: new Uint8Array([1]) },
    }),
    handleServerHello: () => {},
    createClientPayload: () => new Uint8Array([1]),
    encryptPayload: (_state: never, payload: Uint8Array) => payload,
    encryptStatic: () => new Uint8Array([1]),
    clientFinishFactory: () => ({
      type: "clientFinish",
      clientFinish: {
        static: new Uint8Array([1]),
        payload: new Uint8Array([1]),
      },
    }),
  };

  const orchestrator = new HandshakeOrchestrator(dependencies);
  await server.connect();

  await assert.rejects(
    orchestrator.run(1000),
  );
  assert.equal(orchestrator.stage, "failed");
});

test("close during handshake becomes a transport error", async () => {
  const [client, server] = createTransportPair();
  const codec = new HandshakeMessageCodec();

  const orchestrator = new HandshakeOrchestrator({
    transport: client,
    noise: { complete: false } as never,
    handshakeCodec: codec,
    clientHelloFactory: () => ({
      type: "clientHello",
      clientHello: { ephemeral: new Uint8Array([1]) },
    }),
    handleServerHello: () => {},
    createClientPayload: () => new Uint8Array([1]),
    encryptPayload: (_state, payload) => payload,
    encryptStatic: () => new Uint8Array([1]),
    clientFinishFactory: () => ({
      type: "clientFinish",
      clientFinish: {
        static: new Uint8Array([1]),
        payload: new Uint8Array([1]),
      },
    }),
  });

  await server.connect();
  const running = orchestrator.run(1000);
  await new Promise((resolve) => setImmediate(resolve));
  await server.close();

  await assert.rejects(running);
  assert.equal(orchestrator.stage, "failed");
});
