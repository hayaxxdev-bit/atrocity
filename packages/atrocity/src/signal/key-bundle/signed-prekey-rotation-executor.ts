
import type { IqClient } from "../../protocol/iq/index.js";
import type { ProtocolNode } from "../../protocol/node/index.js";
import type { SignalIdentityMaterial, SignalSignedPreKeyMaterial } from "./prekey-bundle-types.js";
import { SignedPreKeyRotation } from "./signed-prekey-rotation.js";
import { WhatsAppPreKeySerializer } from "./whatsapp-prekey-serializer.js";

export type SignedPreKeyRotationExecutorDependencies = {
  readonly iq: Pick<IqClient, "request">;
  readonly identity: SignalIdentityMaterial;
  readonly rotation: SignedPreKeyRotation;
  readonly serializer?: WhatsAppPreKeySerializer;
  readonly nextIqId: () => string;
  readonly persistActive: (next: SignalSignedPreKeyMaterial) => Promise<void>;
};

export type SignedPreKeyRotationExecutionResult = {
  readonly status: "rotated";
  readonly iqId: string;
  readonly previous: SignalSignedPreKeyMaterial;
  readonly active: SignalSignedPreKeyMaterial;
};

export class SignedPreKeyRotationExecutor {
  private readonly serializer: WhatsAppPreKeySerializer;

  constructor(private readonly dependencies: SignedPreKeyRotationExecutorDependencies) {
    this.serializer = dependencies.serializer ?? new WhatsAppPreKeySerializer();
  }

  async execute(
    current: SignalSignedPreKeyMaterial,
    reason: "age" | "server-rejected" | "manual",
    now = Date.now(),
  ): Promise<SignedPreKeyRotationExecutionResult> {
    const next = await this.dependencies.rotation.rotate(
      this.dependencies.identity, current, reason, now,
    );

    const iqId = this.dependencies.nextIqId();
    const rotateNode: ProtocolNode = Object.freeze({
      tag: "rotate",
      attrs: Object.freeze({}),
      content: Object.freeze([
        this.serializer.serializeSignedPreKey(next),
      ]),
    });

    const request: ProtocolNode = Object.freeze({
      tag: "iq",
      attrs: Object.freeze({
        id: iqId,
        to: "s.whatsapp.net",
        type: "set",
        xmlns: "encrypt",
      }),
      content: Object.freeze([rotateNode]),
    });

    await this.dependencies.iq.request(request);
    await this.dependencies.persistActive(next);

    return Object.freeze({
      status: "rotated",
      iqId,
      previous: cloneSigned(current),
      active: cloneSigned(next),
    });
  }
}

function cloneSigned(value: SignalSignedPreKeyMaterial): SignalSignedPreKeyMaterial {
  return Object.freeze({
    ...value,
    publicKey: value.publicKey.slice(),
    privateKey: value.privateKey.slice(),
    signature: value.signature.slice(),
  });
}
