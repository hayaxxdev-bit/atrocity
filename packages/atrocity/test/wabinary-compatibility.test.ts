import assert from "node:assert/strict";
import test from "node:test";
import {
  createWABinaryProfile,
} from "../src/protocol/codec/wabinary-profile.js";
import { WABinaryCodec } from "../src/protocol/codec/wabinary-codec.js";
import { protocolNode } from "../src/protocol/node/index.js";

const profile = createWABinaryProfile(
  Array.from({ length: 256 }, (_, i) =>
    i === 1 ? "message" : i === 2 ? "id" : undefined,
  ),
  new Map([
    ["iq", 3],
    ["reaction", { dict: 0, index: 4 }],
  ]),
  [
    ["read-self", "active", "fbns", "protocol", "reaction"],
  ],
);

test("WABinary encodes tokenized node and decodes it", () => {
  const codec = new WABinaryCodec({ profile });

  const node = protocolNode(
    "message",
    { id: "abc" },
    {
      kind: "text",
      value: "hello",
    },
  );

  const bytes = codec.encode(node);
  const decoded = codec.decode(bytes);

  assert.equal(decoded.tag, "message");
  assert.equal(decoded.attrs.id, "abc");
  assert.equal(decoded.content?.kind, "text");
  assert.equal(
    decoded.content?.kind === "text" ? decoded.content.value : "",
    "hello",
  );
});

test("WABinary supports double-byte dictionary tokens", () => {
  const codec = new WABinaryCodec({ profile });
  const node = protocolNode("reaction", {});

  const bytes = codec.encode(node);
  const decoded = codec.decode(bytes);

  assert.equal(decoded.tag, "reaction");
});

test("WABinary supports user JID pair representation", () => {
  const codec = new WABinaryCodec({ profile });
  const node = protocolNode(
    "message",
    { to: "123@s.whatsapp.net" },
  );

  const decoded = codec.decode(codec.encode(node));
  assert.equal(decoded.attrs.to, "123@s.whatsapp.net");
});

test("WABinary supports device JID representation", () => {
  const codec = new WABinaryCodec({ profile });
  const node = protocolNode(
    "message",
    { to: "123:5@s.whatsapp.net" },
  );

  const decoded = codec.decode(codec.encode(node));
  assert.equal(decoded.attrs.to, "123:5@s.whatsapp.net");
});

test("WABinary preserves nested nodes and binary content", () => {
  const codec = new WABinaryCodec({ profile });
  const node = protocolNode(
    "message",
    {},
    {
      kind: "nodes",
      value: [
        protocolNode(
          "media",
          { id: "1" },
          {
            kind: "binary",
            value: new Uint8Array([0, 1, 2, 255]),
          },
        ),
      ],
    },
  );

  const decoded = codec.decode(codec.encode(node));
  const child = decoded.content?.kind === "nodes"
    ? decoded.content.value[0]
    : undefined;

  assert.equal(child?.tag, "media");
  assert.equal(child?.content?.kind, "binary");
});
