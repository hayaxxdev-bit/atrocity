import type { ProtocolNode } from "../../../node/index.js";
import {
  WhatsAppMessageEncryptor,
  WhatsAppMessageEnvelopeBuilder,
} from "../../../../signal/message/index.js";
import {
  InboundMessageDecryptor,
  type InboundSessionCoordinator,
} from "../decrypt/index.js";
import { MessageDeliveryRuntime } from "../delivery/index.js";
import { MessageRoundTripError } from "./message-roundtrip-errors.js";
import type { MessageRoundTripResult } from "./message-roundtrip-types.js";

export type RoundTripHarnessDependencies = {
  readonly serialize: (plaintext: Uint8Array) => Uint8Array;
  readonly deserialize: (bytes: Uint8Array) => Uint8Array;
  readonly outboundSignal: {
    readonly encryptMessage: (
      jid: string,
      bytes: Uint8Array,
    ) => Promise<{
      readonly type: "msg" | "pkmsg";
      readonly ciphertext: Uint8Array;
    }>;
  };
  readonly inboundSignal: {
    readonly decryptMessage: (
      jid: string,
      type: "msg" | "pkmsg",
      ciphertext: Uint8Array,
    ) => Promise<Uint8Array>;
  };
  readonly outboundSession: InboundSessionCoordinator;
  readonly outerMessage: (
    id: string,
    jid: string,
    envelope: ProtocolNode,
  ) => ProtocolNode;
};

export class MessageRoundTripHarness {
  private readonly outboundEncryptor: WhatsAppMessageEncryptor;
  private readonly inboundDecryptor: InboundMessageDecryptor;
  private readonly delivery = new MessageDeliveryRuntime();

  constructor(
    private readonly dependencies: RoundTripHarnessDependencies,
  ) {
    this.outboundEncryptor = new WhatsAppMessageEncryptor(
      dependencies.outboundSignal,
      new WhatsAppMessageEnvelopeBuilder(),
    );

    this.inboundDecryptor = new InboundMessageDecryptor(
      dependencies.inboundSignal,
      dependencies.outboundSession,
    );
  }

  async run(
    id: string,
    jid: string,
    plaintext: Uint8Array,
  ): Promise<MessageRoundTripResult> {
    if (!id || !jid || !(plaintext instanceof Uint8Array) || plaintext.length === 0) {
      throw new MessageRoundTripError(
        "MESSAGE_ROUNDTRIP_INVALID",
        "Round-trip requires id, jid, and non-empty plaintext.",
      );
    }

    const encoded = this.dependencies.serialize(plaintext);

    let encrypted;
    try {
      encrypted = await this.outboundEncryptor.encrypt(jid, encoded);
    } catch (error) {
      throw new MessageRoundTripError(
        "MESSAGE_ROUNDTRIP_ENCRYPT_FAILED",
        "Outbound encryption failed.",
        { cause: error },
      );
    }

    const envelope = await this.outboundEncryptor.buildEnvelope(jid, encoded);
    const outboundNode = this.dependencies.outerMessage(id, jid, envelope);

    this.delivery.register(id, jid);
    this.delivery.markEncrypted(id);
    this.delivery.markSent(id);

    this.delivery.tracker.transition(id, "server-ack");

    const toNode = outboundNode.content?.kind === "nodes"
      ? outboundNode.content.value.find((child) => child.tag === "to")
      : undefined;

    if (!toNode) {
      throw new MessageRoundTripError(
        "MESSAGE_ROUNDTRIP_INVALID",
        "Outbound message is missing to node.",
      );
    }

    let inboundResult;
    try {
      inboundResult = await this.inboundDecryptor.decrypt(toNode);
    } catch (error) {
      throw new MessageRoundTripError(
        "MESSAGE_ROUNDTRIP_DECRYPT_FAILED",
        "Inbound decryption failed.",
        { cause: error },
      );
    }

    const recovered = this.dependencies.deserialize(
      inboundResult.plaintext,
    );

    if (!bytesEqual(plaintext, recovered)) {
      throw new MessageRoundTripError(
        "MESSAGE_ROUNDTRIP_MISMATCH",
        "Recovered plaintext differs from original plaintext.",
      );
    }

    return Object.freeze({
      status: "round-tripped",
      outboundNode,
      inboundNode: toNode,
      originalPlaintext: plaintext.slice(),
      recoveredPlaintext: recovered.slice(),
      signalType: encrypted.signalType,
      deliveryState: "server-acked",
    });
  }
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
