import type { CryptoProvider } from "../crypto/index.js";
import { NoiseError } from "./noise-errors.js";
import type {
  NoiseKeyPair,
  NoiseProfile,
  NoiseRole,
  NoiseHandshakeResult,
} from "./noise-types.js";

/**
 * Minimal Noise handshake state machine.
 *
 * This milestone deliberately implements only the generic symmetric
 * mechanics needed by the test profile. It is NOT a WhatsApp handshake.
 *
 * State:
 *   Initialize → Write/Read → Complete
 *
 * A production profile must provide the exact pattern/messages required
 * by its target protocol.
 */
export class NoiseHandshake {
  private stateValue: "initialized" | "active" | "complete" | "failed" = "initialized";
  private handshakeHash: Uint8Array;
  private chainingKey: Uint8Array;
  private localEphemeral: NoiseKeyPair;
  private remoteEphemeral?: Uint8Array;

  constructor(
    private readonly crypto: CryptoProvider,
    private readonly profile: NoiseProfile,
    private readonly role: NoiseRole,
    localEphemeral?: NoiseKeyPair,
  ) {
    this.handshakeHash = crypto.hash(profile.hash, concatUtf8(profile.name));
    this.handshakeHash = crypto.hash(
      profile.hash,
      concat(this.handshakeHash, profile.prologue),
    );

    this.chainingKey = this.handshakeHash.slice();
    this.localEphemeral = localEphemeral ?? crypto.generateX25519KeyPair();
    this.mixHash(this.localEphemeral.publicKey);
    this.stateValue = "active";
  }

  get state(): "initialized" | "active" | "complete" | "failed" {
    return this.stateValue;
  }

  get hash(): Uint8Array {
    return this.handshakeHash.slice();
  }

  get ephemeralPublicKey(): Uint8Array {
    return this.localEphemeral.publicKey.slice();
  }

  /**
   * Educational/test-profile operation: mix a remote ephemeral key and
   * derive transport keys once both sides have exchanged keys.
   *
   * This does not claim to implement any specific WhatsApp pattern.
   */
  acceptRemoteEphemeral(remotePublicKey: Uint8Array): void {
    this.requireActive();
    if (remotePublicKey.byteLength !== 32) {
      this.fail("NOISE_INVALID_INPUT", "Remote X25519 public key must be 32 bytes.");
    }

    this.remoteEphemeral = remotePublicKey.slice();

    try {
      const shared = this.crypto.x25519(
        this.localEphemeral.privateKey,
        this.remoteEphemeral,
      );
      this.mixHash(this.remoteEphemeral);
      this.chainingKey = this.crypto.hkdf(
        this.profile.hash,
        shared,
        this.chainingKey,
        new Uint8Array(0),
        64,
      );
    } catch (error) {
      this.failWithCause("NOISE_DH_FAILED", "Failed to process remote ephemeral key.", error);
    }
  }

  complete(): NoiseHandshakeResult {
    this.requireActive();

    if (!this.remoteEphemeral) {
      throw new NoiseError(
        "NOISE_HANDSHAKE_INCOMPLETE",
        "Cannot complete Noise handshake before remote ephemeral key is accepted.",
      );
    }

    try {
      const material = this.crypto.hkdf(
        this.profile.hash,
        this.chainingKey,
        this.chainingKey,
        this.handshakeHash,
        64,
      );

      const first = material.slice(0, 32);
      const second = material.slice(32, 64);

      // Deterministic role split: initiator sends with first key, responder
      // sends with second key.
      const sendCipherKey = this.role === "initiator" ? first : second;
      const receiveCipherKey = this.role === "initiator" ? second : first;

      this.stateValue = "complete";

      return Object.freeze({
        sendCipherKey: sendCipherKey.slice(),
        receiveCipherKey: receiveCipherKey.slice(),
        handshakeHash: this.handshakeHash.slice(),
      });
    } catch (error) {
      this.failWithCause(
        "NOISE_HANDSHAKE_FAILED",
        "Failed to derive Noise transport keys.",
        error,
      );
    }
  }

  private mixHash(data: Uint8Array): void {
    this.handshakeHash = this.crypto.hash(
      this.profile.hash,
      concat(this.handshakeHash, data),
    );
  }

  private requireActive(): void {
    if (this.stateValue === "complete") {
      throw new NoiseError(
        "NOISE_ALREADY_COMPLETE",
        "Noise handshake is already complete.",
      );
    }

    if (this.stateValue !== "active") {
      throw new NoiseError(
        "NOISE_INVALID_STATE",
        `Noise handshake is ${this.stateValue}.`,
      );
    }
  }

  private fail(code: "NOISE_INVALID_INPUT", message: string): never {
    this.stateValue = "failed";
    throw new NoiseError(code, message);
  }

  private failWithCause(
    code: "NOISE_DH_FAILED" | "NOISE_HANDSHAKE_FAILED",
    message: string,
    cause: unknown,
  ): never {
    this.stateValue = "failed";
    throw new NoiseError(code, message, { cause });
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

function concatUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}
