import type { ProtocolNode } from "../../protocol/node/index.js";
import type { SignalKeyBundle, SignalPreKeyMaterial, SignalSignedPreKeyMaterial } from "./prekey-bundle-types.js";
import { validateSignalKeyBundle } from "./prekey-bundle-validator.js";

export class WhatsAppPreKeySerializer {
  serializeSignedPreKey(preKey: SignalSignedPreKeyMaterial): ProtocolNode {
    validateId(preKey.id, "signed pre-key");
    return protocolNode("skey", {}, { kind: "nodes", value: Object.freeze([
      protocolNode("id", {}, bytes(encodeBigEndian(preKey.id, 3))),
      protocolNode("value", {}, bytes(preKey.publicKey)),
      protocolNode("signature", {}, bytes(preKey.signature)),
    ]) });
  }

  serializePreKey(preKey: SignalPreKeyMaterial): ProtocolNode {
    validateId(preKey.id, "pre-key");
    return protocolNode("key", {}, { kind: "nodes", value: Object.freeze([
      protocolNode("id", {}, bytes(encodeBigEndian(preKey.id, 3))),
      protocolNode("value", {}, bytes(preKey.publicKey)),
    ]) });
  }

  serializeBundle(bundle: SignalKeyBundle) {
    validateSignalKeyBundle(bundle);
    return Object.freeze({
      signedPreKey: this.serializeSignedPreKey(bundle.signedPreKey),
      preKeys: Object.freeze(bundle.preKeys.map((key) => this.serializePreKey(key))),
    });
  }
}

function validateId(id: number, label: string): void {
  if (!Number.isSafeInteger(id) || id <= 0 || id > 0xffffff) throw new RangeError(`${label} id must fit in three-byte unsigned integer.`);
}

function encodeBigEndian(value: number, bytes: number): Uint8Array {
  const output = new Uint8Array(bytes);
  for (let i = bytes - 1; i >= 0; i -= 1) { output[i] = value & 0xff; value = Math.floor(value / 256); }
  return output;
}

function bytes(value: Uint8Array): ProtocolNode["content"] { return Object.freeze({ kind: "binary", value: value.slice() }); }
