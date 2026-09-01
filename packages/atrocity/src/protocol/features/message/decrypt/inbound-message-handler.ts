import type { ProtocolNode } from "../../../node/index.js";
import type { WAMessageBinaryCodec } from "../../../protobuf/wa-message-codec.js";
import {
  InboundMessageDecryptor,
} from "./inbound-message-decryptor.js";
import {
  InboundMessageDecryptError,
} from "./inbound-message-decrypt-errors.js";

export type InboundMessageHandler = {
  readonly decryptor: InboundMessageDecryptor;
  readonly codec: WAMessageBinaryCodec;
  readonly publish: (messageNode: ProtocolNode) => Promise<void>;
  readonly buildMessageNode?: (
    decrypted: import("../../../protobuf/wa-message-types.js").WAMessage,
    original: ProtocolNode,
  ) => ProtocolNode;
};

export async function handleInboundEncryptedMessage(
  input: ProtocolNode,
  dependencies: InboundMessageHandler,
): Promise<ProtocolNode> {
  const result =
    await dependencies.decryptor.decrypt(input);

  let message;
  try {
    message = dependencies.codec.decode(
      result.plaintext,
    );
  } catch (error) {
    throw new InboundMessageDecryptError(
      "INBOUND_DECRYPT_FAILED",
      "Failed to decode decrypted WAMessage.",
      { cause: error },
    );
  }

  const node =
    dependencies.buildMessageNode?.(message, input) ??
    input;

  await dependencies.publish(node);

  return node;
}
