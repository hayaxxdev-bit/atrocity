import assert from "node:assert/strict";
import test from "node:test";
import {
  ProtocolRuntime,
  WhatsAppStreamBootstrap,
  WhatsAppStreamFeaturesDecoder,
  buildWhatsAppStreamOpen,
  protocolNode,
} from "../src/protocol/index.js";

test("stream open is explicit and deterministic", () => {
  const node = buildWhatsAppStreamOpen({
    domain: "s.whatsapp.net",
    version: [2, 3000, 1],
    client: "WhatsApp Web",
    connectType: "WIFI",
    connectReason: "USER_ACTIVATED",
  });

  assert.deepEqual(node.attrs, {
    to: "s.whatsapp.net",
    version: "2.3000.1",
    client: "WhatsApp Web",
    connect_type: "WIFI",
    connect_reason: "USER_ACTIVATED",
  });
});

test("feature decoder preserves raw node and derived set", () => {
  const node = protocolNode(
    "stream:features",
    {},
    protocolNode("message", { xmlns: "urn:test:message" }),
    protocolNode("presence", { xmlns: "urn:test:presence" }),
  );

  const result = new WhatsAppStreamFeaturesDecoder().decode(node);
  assert.equal(result.node, node);
  assert.deepEqual(result.features.tags, ["message", "presence"]);
});

test("WhatsApp bootstrap delegates lifecycle to StreamRuntime", async () => {
  const protocol = new ProtocolRuntime({ sendNode: async () => {} });
  const bootstrap = new WhatsAppStreamBootstrap({
    open: {
      domain: "s.whatsapp.net",
      version: [2, 3000, 1],
    },
    protocol,
    transport: {
      sendNode: async () => {},
      receiveNode: async () =>
        protocolNode(
          "stream:features",
          {},
          protocolNode("message", { xmlns: "urn:xmpp:message" }),
        ),
    },
  });

  assert.equal(bootstrap.buildOpenNode().tag, "stream:open");
  bootstrap.markAuthenticated();
  const result = await bootstrap.open();
  assert.equal(result.state, "ready");
});
