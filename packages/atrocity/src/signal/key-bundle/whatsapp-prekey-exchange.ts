import type { ProtocolNode } from "../../protocol/node/index.js";
import { buildEncryptPreKeyUploadIq } from "../../protocol/iq/whatsapp/index.js";
import type { SignalKeyBundle } from "./prekey-bundle-types.js";
import { validateSignalKeyBundle } from "./prekey-bundle-validator.js";

export type WhatsAppPreKeySerializer = {
  readonly serializePreKey: (
    bundle: SignalKeyBundle,
  ) => readonly ProtocolNode[];
};

export class WhatsAppPreKeyExchange {
  constructor(
    private readonly serializer: WhatsAppPreKeySerializer,
  ) {}

  buildUploadIq(
    id: string,
    bundle: SignalKeyBundle,
  ): ProtocolNode {
    validateSignalKeyBundle(bundle);

    const items = this.serializer.serializePreKey(bundle);
    return buildEncryptPreKeyUploadIq(id, items);
  }
}
