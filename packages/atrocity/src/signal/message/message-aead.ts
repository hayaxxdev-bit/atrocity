import type { CryptoProvider } from "../../crypto/index.js";
import { MessageCryptoError } from "./message-errors.js";

export class SignalMessageAead {
  constructor(
    private readonly crypto: CryptoProvider,
  ) {}

  encrypt(
    messageKey: Uint8Array,
    associatedData: Uint8Array,
    plaintext: Uint8Array,
  ): Uint8Array {
    validateKey(messageKey);

    // Signal message-key AEAD uses a 32-byte message key. The concrete
    // construction is kept in this adapter so the session does not care
    // about the backend cipher.
    const nonce = new Uint8Array(12);

    try {
      const result = this.crypto.aeadEncrypt(
        "AES-256-GCM",
        messageKey,
        nonce,
        plaintext,
        associatedData,
      );
      return concat(result.ciphertext, result.tag);
    } catch (error) {
      throw new MessageCryptoError(
        "MESSAGE_INVALID_CIPHERTEXT",
        "Failed to encrypt Signal message.",
        { cause: error },
      );
    }
  }

  decrypt(
    messageKey: Uint8Array,
    associatedData: Uint8Array,
    ciphertext: Uint8Array,
  ): Uint8Array {
    validateKey(messageKey);

    if (ciphertext.byteLength < 16) {
      throw new MessageCryptoError(
        "MESSAGE_INVALID_CIPHERTEXT",
        "Signal ciphertext is shorter than the authentication tag.",
      );
    }

    try {
      const bodyLength = ciphertext.byteLength - 16;
      return this.crypto.aeadDecrypt(
        "AES-256-GCM",
        messageKey,
        new Uint8Array(12),
        ciphertext.slice(0, bodyLength),
        ciphertext.slice(bodyLength),
        associatedData,
      );
    } catch (error) {
      throw new MessageCryptoError(
        "MESSAGE_AUTH_FAILED",
        "Signal message authentication failed.",
        { cause: error },
      );
    }
  }
}

function validateKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.byteLength !== 32) {
    throw new MessageCryptoError(
      "MESSAGE_KEY_UNAVAILABLE",
      "Signal message key must be exactly 32 bytes.",
    );
  }
}

function concat(...values: Uint8Array[]): Uint8Array {
  const total = values.reduce((sum, value) => sum + value.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const value of values) {
    output.set(value, offset);
    offset += value.byteLength;
  }
  return output;
}
