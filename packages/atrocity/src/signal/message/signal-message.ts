import type { CryptoProvider } from "../../crypto/index.js";
import { DHRatchet } from "../ratchet/dh-ratchet.js";
import { RatchetReceiver } from "../ratchet/ratchet-receiver.js";
import type { MessageKey } from "../ratchet/ratchet-types.js";
import { SignalMessageHeaderCodec } from "./message-header-codec.js";
import { SignalMessageAead } from "./message-aead.js";
import { MessageCryptoError } from "./message-errors.js";
import type {
  SignalCiphertext,
  SignalMessageHeader,
  SignalPlaintextMessage,
} from "./message-types.js";

export type SignalMessageSession = {
  readonly ratchet: DHRatchet;
  readonly receiver: RatchetReceiver;
  readonly associatedData: Uint8Array;
};

export class SignalMessageCrypto {
  readonly headerCodec = new SignalMessageHeaderCodec();
  readonly aead: SignalMessageAead;

  constructor(private readonly crypto: CryptoProvider) {
    this.aead = new SignalMessageAead(crypto);
  }

  createOutgoing(
    session: SignalMessageSession,
    messageKey: MessageKey,
    plaintext: Uint8Array,
  ): SignalCiphertext {
    const header: SignalMessageHeader = session.ratchet.createHeader();

    try {
      const aad = buildAssociatedData(
        session.associatedData,
        header,
        this.headerCodec,
      );

      const ciphertext = this.aead.encrypt(
        messageKey.key,
        aad,
        plaintext,
      );

      return Object.freeze({
        header: cloneHeader(header),
        ciphertext,
      });
    } catch (error) {
      if (error instanceof MessageCryptoError) throw error;
      throw new MessageCryptoError(
        "MESSAGE_INVALID_CIPHERTEXT",
        "Failed to build outgoing Signal message.",
        { cause: error },
      );
    }
  }

  receiveIncoming(
    session: SignalMessageSession,
    message: SignalCiphertext,
  ): SignalPlaintextMessage {
    const header = cloneHeader(message.header);
    const aad = buildAssociatedData(
      session.associatedData,
      header,
      this.headerCodec,
    );

    return {
      header,
      plaintext: session.receiver.receiveAndDecrypt(
        header,
        (messageKey) => this.aead.decrypt(
          messageKey,
          aad,
          message.ciphertext,
        ),
      ),
    };
  }
}

function buildAssociatedData(
  applicationData: Uint8Array,
  header: SignalMessageHeader,
  codec: SignalMessageHeaderCodec,
): Uint8Array {
  const encodedHeader = codec.encode(header);
  const output = new Uint8Array(
    applicationData.byteLength + encodedHeader.byteLength,
  );
  output.set(applicationData, 0);
  output.set(encodedHeader, applicationData.byteLength);
  return output;
}

function cloneHeader(
  header: SignalMessageHeader,
): SignalMessageHeader {
  return Object.freeze({
    ratchetPublicKey: header.ratchetPublicKey.slice(),
    previousChainLength: header.previousChainLength,
    messageNumber: header.messageNumber,
  });
}
