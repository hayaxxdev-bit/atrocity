import assert from "node:assert/strict";
import test from "node:test";
import {
  MessageRetryOrchestrator,
} from "../src/protocol/features/message/index.js";
import { protocolNode } from "../src/protocol/index.js";

test("server retry re-encrypts without rebuilding a healthy session", async () => {
  const order: string[] = [];
  const orchestrator = new MessageRetryOrchestrator({
    signal: {
      encryptMessage: async () => {
        order.push("encrypt");
        return { type: "msg", ciphertext: new Uint8Array([1,2]) };
      },
    },
    session: {
      isHealthy: async () => {
        order.push("health");
        return true;
      },
      rebuild: async () => order.push("rebuild"),
    },
    buildOuterMessage: (input, encrypted) => {
      order.push("build");
      return protocolNode("message", { id: input.messageId }, {
        kind: "nodes",
        value: encrypted,
      });
    },
    sendNode: async () => order.push("send"),
  });

  const result = await orchestrator.retry({
    messageId: "m1",
    remoteJid: "123@s.whatsapp.net",
    reason: "server-retry",
    plaintext: new Uint8Array([9]),
  });

  assert.equal(result.reEncrypted, true);
  assert.equal(result.sessionRebuilt, false);
  assert.deepEqual(order, ["health", "encrypt", "build", "send"]);
  assert.equal(orchestrator.state, "completed");
});

test("decryption failure repairs session before encryption", async () => {
  const order: string[] = [];
  const orchestrator = new MessageRetryOrchestrator({
    signal: {
      encryptMessage: async () => {
        order.push("encrypt");
        return { type: "pkmsg", ciphertext: new Uint8Array([1]) };
      },
    },
    session: {
      isHealthy: async () => {
        order.push("health");
        return true;
      },
      rebuild: async () => order.push("rebuild"),
    },
    buildOuterMessage: (input, encrypted) => {
      order.push("build");
      return protocolNode("message", { id: input.messageId }, {
        kind: "nodes",
        value: encrypted,
      });
    },
    sendNode: async () => order.push("send"),
  });

  const result = await orchestrator.retry({
    messageId: "m2",
    remoteJid: "123@s.whatsapp.net",
    reason: "decryption-failure",
    plaintext: new Uint8Array([1]),
  });

  assert.equal(result.sessionRebuilt, true);
  assert.deepEqual(order, ["health", "rebuild", "encrypt", "build", "send"]);
});

test("send failure is never reported as completed", async () => {
  const orchestrator = new MessageRetryOrchestrator({
    signal: {
      encryptMessage: async () => ({
        type: "msg",
        ciphertext: new Uint8Array([1]),
      }),
    },
    session: {
      isHealthy: async () => true,
      rebuild: async () => {},
    },
    buildOuterMessage: () => protocolNode("message"),
    sendNode: async () => { throw new Error("offline"); },
  });

  await assert.rejects(() => orchestrator.retry({
    messageId: "m3",
    remoteJid: "123@s.whatsapp.net",
    reason: "server-retry",
    plaintext: new Uint8Array([1]),
  }));

  assert.equal(orchestrator.state, "failed");
});
