import type { ServerHello } from "./handshake-types.js";
import { NoiseError } from "../../noise/noise-errors.js";
import { validateWhatsAppServerHello } from "./whatsapp-server-hello.js";

export type NoiseKeyPair = {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
};

export type WhatsAppCertificateChain = {
  readonly intermediate: {
    readonly details: Uint8Array;
    readonly signature: Uint8Array;
  };
  readonly leaf: {
    readonly details: Uint8Array;
    readonly signature: Uint8Array;
  };
};

export type WhatsAppServerHelloProcessorDependencies = {
  readonly clientEphemeralPrivateKey: Uint8Array;
  readonly noiseKeyPair: NoiseKeyPair;
  readonly sharedKey: (
    privateKey: Uint8Array,
    publicKey: Uint8Array,
  ) => Uint8Array;
  readonly authenticate: (data: Uint8Array) => void;
  readonly mixIntoKey: (data: Uint8Array) => void;
  readonly decrypt: (ciphertext: Uint8Array) => Uint8Array;
  readonly encrypt: (plaintext: Uint8Array) => Uint8Array;
  readonly decodeCertificateChain: (plaintext: Uint8Array) => WhatsAppCertificateChain;
  readonly decodeIntermediateDetails: (
    details: Uint8Array,
  ) => { readonly key: Uint8Array; readonly issuerSerial: number };
  readonly verifySignature: (
    publicKey: Uint8Array,
    message: Uint8Array,
    signature: Uint8Array,
  ) => boolean;
  readonly certificateAuthorityPublicKey: Uint8Array;
  readonly certificateAuthoritySerial: number;
};

export type WhatsAppServerHelloProcessResult = {
  readonly encryptedStatic: Uint8Array;
  readonly decryptedStaticKey: Uint8Array;
  readonly certificate: WhatsAppCertificateChain;
};

export class WhatsAppServerHelloProcessor {
  constructor(
    private readonly deps: WhatsAppServerHelloProcessorDependencies,
  ) {}

  process(serverHello: ServerHello): WhatsAppServerHelloProcessResult {
    validateWhatsAppServerHello(serverHello);

    try {
      // Reference order from current Baileys:
      // authenticate(server ephemeral)
      this.deps.authenticate(serverHello.ephemeral);

      // mix DH(client ephemeral private, server ephemeral)
      this.deps.mixIntoKey(
        this.deps.sharedKey(
          this.deps.clientEphemeralPrivateKey,
          serverHello.ephemeral,
        ),
      );

      // decrypt server static, then mix its DH
      const decryptedStaticKey = this.deps.decrypt(serverHello.static!);
      if (decryptedStaticKey.byteLength !== 32) {
        throw new NoiseError(
          "NOISE_INVALID_INPUT",
          "Decrypted server static key must be 32 bytes.",
        );
      }

      this.deps.mixIntoKey(
        this.deps.sharedKey(
          this.deps.clientEphemeralPrivateKey,
          decryptedStaticKey,
        ),
      );

      // decrypt and verify certificate chain
      const certificatePlaintext = this.deps.decrypt(serverHello.payload!);
      const certificate =
        this.deps.decodeCertificateChain(certificatePlaintext);

      const intermediate =
        this.deps.decodeIntermediateDetails(
          certificate.intermediate.details,
        );

      if (
        !this.deps.verifySignature(
          intermediate.key,
          certificate.leaf.details,
          certificate.leaf.signature,
        )
      ) {
        throw new NoiseError(
          "NOISE_HANDSHAKE_FAILED",
          "WhatsApp leaf certificate signature is invalid.",
        );
      }

      if (
        !this.deps.verifySignature(
          this.deps.certificateAuthorityPublicKey,
          certificate.intermediate.details,
          certificate.intermediate.signature,
        )
      ) {
        throw new NoiseError(
          "NOISE_HANDSHAKE_FAILED",
          "WhatsApp intermediate certificate signature is invalid.",
        );
      }

      if (
        intermediate.issuerSerial !==
        this.deps.certificateAuthoritySerial
      ) {
        throw new NoiseError(
          "NOISE_HANDSHAKE_FAILED",
          "WhatsApp certificate issuer serial does not match.",
        );
      }

      // encrypt client Noise static for clientFinish.static
      const encryptedStatic = this.deps.encrypt(
        this.deps.noiseKeyPair.publicKey,
      );

      // final DH using the Noise static key pair
      this.deps.mixIntoKey(
        this.deps.sharedKey(
          this.deps.noiseKeyPair.privateKey,
          serverHello.ephemeral,
        ),
      );

      return Object.freeze({
        encryptedStatic: encryptedStatic.slice(),
        decryptedStaticKey: decryptedStaticKey.slice(),
        certificate,
      });
    } catch (error) {
      if (error instanceof NoiseError) throw error;
      throw new NoiseError(
        "NOISE_HANDSHAKE_FAILED",
        "WhatsApp ServerHello processing failed.",
        { cause: error },
      );
    }
  }
}
