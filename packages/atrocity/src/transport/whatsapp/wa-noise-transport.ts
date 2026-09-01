import type { CryptoProvider } from "../../crypto/index.js";
import type { NoiseTransportCipher } from "../../noise/noise-cipher-state.js";
import type { WhatsAppNoiseFrame } from "./wa-noise-frame-types.js";
import { WhatsAppNoiseFrameCodec } from "./wa-noise-frame-codec.js";
import { WHATSAPP_NOISE_HEADER } from "../../noise/whatsapp-profile.js";

export type WhatsAppNoiseTransportConfig = {
  readonly frameHeader?: Uint8Array;
};

export class WhatsAppNoiseTransport {
  readonly codec: WhatsAppNoiseFrameCodec;

  private cipher?: NoiseTransportCipher;

  constructor(
    private readonly crypto: CryptoProvider,
    config: WhatsAppNoiseTransportConfig = {},
  ) {
    void this.crypto;
    this.codec = new WhatsAppNoiseFrameCodec();
    this.frameHeader =
      config.frameHeader?.slice() ??
      WHATSAPP_NOISE_HEADER.slice();
  }

  private readonly frameHeader: Uint8Array;

  installCipher(cipher: NoiseTransportCipher): void {
    this.cipher = cipher;
  }

  encode(
    plaintext: Uint8Array,
    associatedData: Uint8Array = new Uint8Array(0),
  ): Uint8Array {
    if (!this.cipher) {
      throw new Error("Noise transport cipher has not been installed.");
    }

    const ciphertext = this.cipher.encryptWithAd(
      associatedData,
      plaintext,
    );

    return this.codec.encode(
      this.frameHeader,
      ciphertext,
    );
  }

  decode(
    frame: Uint8Array,
    associatedData: Uint8Array = new Uint8Array(0),
  ): WhatsAppNoiseFrame & { readonly plaintext: Uint8Array } {
    if (!this.cipher) {
      throw new Error("Noise transport cipher has not been installed.");
    }

    const parsed = this.codec.decode(
      this.frameHeader,
      frame,
    );

    const plaintext = this.cipher.decryptWithAd(
      associatedData,
      parsed.ciphertext,
    );

    return Object.freeze({
      ...parsed,
      plaintext,
    });
  }
}
