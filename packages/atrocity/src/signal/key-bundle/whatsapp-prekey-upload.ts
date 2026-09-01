import type { ProtocolNode } from "../../protocol/node/index.js";
import { buildEncryptPreKeyUploadIq } from "../../protocol/iq/whatsapp/index.js";
import type { SignalKeyBundle } from "./prekey-bundle-types.js";
import { validateSignalKeyBundle } from "./prekey-bundle-validator.js";
import { WhatsAppPreKeySerializer } from "./whatsapp-prekey-serializer.js";

export class WhatsAppPreKeyUploadBuilder {
  constructor(private readonly serializer = new WhatsAppPreKeySerializer()) {}
  build(id: string, bundle: SignalKeyBundle): ProtocolNode {
    validateSignalKeyBundle(bundle);
    const serialized = this.serializer.serializeBundle(bundle);
    return buildEncryptPreKeyUploadIq(id, [serialized.signedPreKey, ...serialized.preKeys]);
  }
}
