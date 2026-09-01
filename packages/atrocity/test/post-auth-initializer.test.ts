import assert from "node:assert/strict";
import test from "node:test";
import { PostAuthenticationInitializer } from "../src/auth/index.js";

test("post-auth runs initialization in deterministic order", async () => {
  const order: string[] = [];

  const initializer = new PostAuthenticationInitializer({
    ensurePreKeys: async () => order.push("prekeys"),
    finalizeCredentials: async () => order.push("credentials"),
    initializePresence: async () => order.push("presence"),
    validateKeyBundle: async () => order.push("digest"),
  });

  const result = await initializer.run();

  assert.equal(result.stage, "authenticated");
  assert.deepEqual(order, [
    "prekeys",
    "credentials",
    "presence",
    "digest",
  ]);
  assert.equal(initializer.stage, "authenticated");
});

test("pre-key failure prevents later initialization", async () => {
  const order: string[] = [];

  const initializer = new PostAuthenticationInitializer({
    ensurePreKeys: async () => {
      order.push("prekeys");
      throw new Error("upload failed");
    },
    finalizeCredentials: async () => order.push("credentials"),
    initializePresence: async () => order.push("presence"),
    validateKeyBundle: async () => order.push("digest"),
  });

  await assert.rejects(() => initializer.run());
  assert.equal(initializer.stage, "failed");
  assert.deepEqual(order, ["prekeys"]);
});

test("key bundle validation is the final gate", async () => {
  let digest = 0;

  const initializer = new PostAuthenticationInitializer({
    ensurePreKeys: async () => {},
    finalizeCredentials: async () => {},
    initializePresence: async () => {},
    validateKeyBundle: async () => {
      digest += 1;
    },
  });

  await initializer.run();
  assert.equal(digest, 1);
});
