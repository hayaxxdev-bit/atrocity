import type { CryptoProvider } from "../crypto/index.js";
import { NoiseError } from "./noise-errors.js";
import { NoiseSymmetricState } from "./noise-symmetric-state.js";
import { NoiseTransportCipher } from "./noise-cipher-state.js";
import type {
  NoiseDependencies,
  NoiseHandshakeResult,
  NoiseKeyPair,
  NoiseProfile,
  NoiseRole,
} from "./noise-types.js";

export class NoiseEngine {
  readonly symmetric: NoiseSymmetricState;
  readonly ephemeral: NoiseKeyPair;

  private readonly role: NoiseRole;
  private readonly privateHash: Uint8Array;
  private transportSend?: NoiseTransportCipher;
  private transportReceive?: NoiseTransportCipher;
  private finalHash?: Uint8Array;

  constructor(
    private readonly dependencies: NoiseDependencies,
    role: NoiseRole,
    localEphemeral?: NoiseKeyPair,
  ) {
    this.role = role;
    this.ephemeral = localEphemeral ??
      dependencies.crypto.generateX25519KeyPair();

    this.symmetric = new NoiseSymmetricState(
      dependencies.crypto,
      dependencies.profile.hash,
      new TextEncoder().encode(dependencies.profile.name),
    );

    if (dependencies.profile.prologue.byteLength > 0) {
      this.symmetric.mixHash(dependencies.profile.prologue);
    }

    this.symmetric.mixHash(this.ephemeral.publicKey);
    this.privateHash = this.symmetric.handshakeHash;
  }

  get profile(): NoiseProfile {
    return this.dependencies.profile;
  }

  get crypto(): CryptoProvider {
    return this.dependencies.crypto;
  }

  get state(): "handshaking" | "transport-ready" | "failed" {
    if (this.transportSend && this.transportReceive) {
      return "transport-ready";
    }
    return "handshaking";
  }

  acceptRemoteEphemeral(remotePublicKey: Uint8Array): void {
    if (this.transportSend) {
      throw new NoiseError(
        "NOISE_ALREADY_COMPLETE",
        "Cannot modify a completed Noise session.",
      );
    }

    if (remotePublicKey.byteLength !== 32) {
      throw new NoiseError(
        "NOISE_INVALID_INPUT",
        "Remote X25519 public key must be exactly 32 bytes.",
      );
    }

    try {
      const shared = this.crypto.x25519(
        this.ephemeral.privateKey,
        remotePublicKey,
      );

      this.symmetric.mixHash(remotePublicKey);
      this.symmetric.mixKey(shared);
    } catch (error) {
      throw new NoiseError(
        "NOISE_DH_FAILED",
        "Failed to perform X25519 key agreement.",
        { cause: error },
      );
    }
  }

  completeHandshake(): NoiseHandshakeResult {
    if (this.transportSend && this.transportReceive && this.finalHash) {
      return {
        handshakeHash: this.finalHash.slice(),
      };
    }

    const [first, second] = this.symmetric.split();
    this.transportSend = this.role === "initiator" ? first : second;
    this.transportReceive = this.role === "initiator" ? second : first;
    this.finalHash = this.symmetric.handshakeHash;

    return {
      handshakeHash: this.finalHash.slice(),
    };
  }

  encrypt(plaintext: Uint8Array, aad = new Uint8Array(0)): Uint8Array {
    if (!this.transportSend) {
      throw new NoiseError(
        "NOISE_INVALID_STATE",
        "Noise transport is not ready.",
      );
    }

    return this.transportSend.encryptWithAd(aad, plaintext);
  }

  decrypt(
    ciphertext: Uint8Array,
    aad = new Uint8Array(0),
  ): Uint8Array {
    if (!this.transportReceive) {
      throw new NoiseError(
        "NOISE_INVALID_STATE",
        "Noise transport is not ready.",
      );
    }

    return this.transportReceive.decryptWithAd(aad, ciphertext);
  }

  get handshakeHash(): Uint8Array {
    return (this.finalHash ?? this.symmetric.handshakeHash).slice();
  }
}
