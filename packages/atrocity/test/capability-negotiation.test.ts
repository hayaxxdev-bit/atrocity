import assert from "node:assert/strict";
import test from "node:test";
import {
  CapabilityNegotiator,
  ServerCapabilityMap,
} from "../src/protocol/index.js";

test("negotiation enables required supported capability", () => {
  const mapper = new ServerCapabilityMap();
  const server = mapper.fromFeatureSet({
    namespaces: ["urn:xmpp:message"],
    tags: [],
  });

  const result = new CapabilityNegotiator().negotiate(
    server,
    [{
      feature: "message",
      required: ["messaging"],
    }],
  );

  assert.equal(result.negotiated.messaging.decision, "enabled");
  assert.deepEqual(result.enabledFeatures, ["message"]);
  assert.deepEqual(result.requiredFailures, []);
});

test("negotiation disables feature when required capability is missing", () => {
  const mapper = new ServerCapabilityMap();
  const server = mapper.fromFeatureSet({
    namespaces: [],
    tags: [],
  });

  const result = new CapabilityNegotiator().negotiate(
    server,
    [{
      feature: "groups",
      required: ["groups"],
    }],
  );

  assert.equal(result.negotiated.groups.decision, "unsupported");
  assert.deepEqual(result.disabledFeatures, ["groups"]);
  assert.equal(result.requiredFailures.length, 1);
});

test("strict negotiation rejects missing required capability", () => {
  const mapper = new ServerCapabilityMap();
  const server = mapper.fromFeatureSet({
    namespaces: [],
    tags: [],
  });

  assert.throws(() =>
    new CapabilityNegotiator().negotiateStrict(
      server,
      [{
        feature: "groups",
        required: ["groups"],
      }],
    )
  );
});

test("optional supported capability is enabled", () => {
  const mapper = new ServerCapabilityMap();
  const server = mapper.fromFeatureSet({
    namespaces: ["urn:xmpp:media"],
    tags: [],
  });

  const result = new CapabilityNegotiator().negotiate(
    server,
    [{
      feature: "message",
      required: ["messaging"],
      optional: ["media"],
    }],
  );

  assert.equal(result.negotiated.media.decision, "enabled");
});
