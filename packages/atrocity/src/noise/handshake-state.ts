import type { CryptoProvider } from "../crypto/index.js";
import { NoiseError } from "./noise-errors.js";
import type { NoiseKeyPair, NoiseProfile, NoiseRole } from "./noise-types.js";
import {
  type HandshakeToken,
  type NoiseHandshakePattern,
  messageTokens,
} from "./handshake-pattern.js";
import { NoiseSymmetricState } from "./noise-symmetric-state.js";
import { NoiseTransportCipher } from "./noise-cipher-state.js";

export type HandshakeMessageResult = {
  readonly payload: Uint8Array;
  readonly messageIndex: number;
};

export type HandshakeStateConfig = {
  readonly crypto: CryptoProvider;
  readonly profile: NoiseProfile;
  readonly pattern: NoiseHandshakePattern;
  readonly role: NoiseRole;
  readonly staticKey?: NoiseKeyPair;
  readonly ephemeralKey?: NoiseKeyPair;
  readonly remoteStatic?: Uint8Array;
  readonly remoteEphemeral?: Uint8Array;
  readonly psk?: Uint8Array;
  readonly prologue?: Uint8Array;
};

/**
 * Generic Noise HandshakeState.
 *
 * The pattern is data-driven. Token processing follows Noise revision 34:
 * e/s update the handshake hash; DH tokens feed MixKey; psk feeds
 * MixKeyAndHash; and handshake payloads are processed after all tokens.
 */
export class NoiseHandshakeState {
  private readonly crypto: CryptoProvider;
  private readonly pattern: NoiseHandshakePattern;
  private readonly role: NoiseRole;
  private readonly symmetric: NoiseSymmetricState;
  private readonly staticKey?: NoiseKeyPair;
  private readonly psk?: Uint8Array;

  private ephemeralKey?: NoiseKeyPair;
  private remoteStaticKey?: Uint8Array;
  private remoteEphemeralKey?: Uint8Array;
  private messageIndexValue = 0;
  private completeValue = false;
  private failedValue = false;

  constructor(config: HandshakeStateConfig) {
    this.crypto = config.crypto;
    this.pattern = config.pattern;
    this.role = config.role;
    this.staticKey = cloneKeyPair(config.staticKey);
    this.ephemeralKey = cloneKeyPair(config.ephemeralKey);
    this.remoteStaticKey = config.remoteStatic?.slice();
    this.remoteEphemeralKey = config.remoteEphemeral?.slice();
    this.psk = config.psk?.slice();

    if (this.psk && this.psk.byteLength !== 32) {
      throw new NoiseError(
        "NOISE_INVALID_INPUT",
        "Noise PSK must be exactly 32 bytes.",
      );
    }

    const protocolName = new TextEncoder().encode(
      `Noise_${this.pattern.name}_${config.profile.dh}_${config.profile.cipher}_${config.profile.hash}`,
    );

    this.symmetric = new NoiseSymmetricState(
      this.crypto,
      config.profile.hash,
      protocolName,
    );

    this.symmetric.mixHash(config.prologue ?? config.profile.prologue);
    this.mixPreMessages(config);
    this.validateConcreteKeyRequirements();
  }

  get messageIndex(): number {
    return this.messageIndexValue;
  }

  get complete(): boolean {
    return this.completeValue;
  }

  get failed(): boolean {
    return this.failedValue;
  }

  get handshakeHash(): Uint8Array {
    return this.symmetric.handshakeHash;
  }

  get ephemeralPublicKey(): Uint8Array | undefined {
    return this.ephemeralKey?.publicKey.slice();
  }

  get staticPublicKey(): Uint8Array | undefined {
    return this.staticKey?.publicKey.slice();
  }

  get remoteEphemeral(): Uint8Array | undefined {
    return this.remoteEphemeralKey?.slice();
  }

  get remoteStatic(): Uint8Array | undefined {
    return this.remoteStaticKey?.slice();
  }

  writeMessage(payload = new Uint8Array(0)): Uint8Array {
    this.ensureActive();
    this.ensureLocalTurn();

    const outputs: Uint8Array[] = [];

    for (const token of messageTokens(this.pattern, this.messageIndexValue)) {
      outputs.push(this.writeToken(token));
    }

    outputs.push(this.symmetric.encryptAndHash(payload));
    this.advance();

    return concat(...outputs);
  }

  readMessage(message: Uint8Array): HandshakeMessageResult {
    this.ensureActive();
    this.ensureRemoteTurn();

    let offset = 0;

    try {
      for (const token of messageTokens(this.pattern, this.messageIndexValue)) {
        const result = this.readToken(token, message, offset);
        offset = result.offset;
      }

      const encryptedPayload = message.slice(offset);
      const payload = this.symmetric.decryptAndHash(encryptedPayload);
      const messageIndex = this.messageIndexValue;
      this.advance();

      return Object.freeze({ payload, messageIndex });
    } catch (error) {
      this.failedValue = true;
      throw error;
    }
  }

  split(): readonly [NoiseTransportCipher, NoiseTransportCipher] {
    if (!this.completeValue || this.failedValue) {
      throw new NoiseError(
        "NOISE_HANDSHAKE_INCOMPLETE",
        "Handshake must complete successfully before Split().",
      );
    }
    return this.symmetric.split();
  }

  private writeToken(token: HandshakeToken): Uint8Array {
    switch (token) {
      case "e": {
        this.ensureEphemeral();
        this.symmetric.mixHash(this.ephemeralKey!.publicKey);
        return this.ephemeralKey!.publicKey.slice();
      }

      case "s": {
        if (!this.staticKey) {
          throw new NoiseError(
            "NOISE_INVALID_STATE",
            "Static key material is required by this pattern.",
          );
        }
        return this.symmetric.encryptAndHash(this.staticKey.publicKey);
      }

      case "ee":
      case "es":
      case "se":
      case "ss":
        this.performDh(token);
        return new Uint8Array(0);

      case "psk":
        this.ensurePsk();
        this.symmetric.mixKeyAndHash(this.psk!);
        return new Uint8Array(0);
    }
  }

  private readToken(
    token: HandshakeToken,
    message: Uint8Array,
    offset: number,
  ): { readonly offset: number } {
    switch (token) {
      case "e": {
        const key = this.requireBytes(message, offset, 32, "remote ephemeral key");
        this.remoteEphemeralKey = key;
        this.symmetric.mixHash(key);
        return { offset: offset + 32 };
      }

      case "s": {
        const length = this.symmetric.hasCipherKey ? 48 : 32;
        const encrypted = this.requireBytes(
          message,
          offset,
          length,
          "remote static key",
        );
        this.remoteStaticKey = this.symmetric.decryptAndHash(encrypted);
        if (this.remoteStaticKey.byteLength !== 32) {
          throw new NoiseError(
            "NOISE_HANDSHAKE_FAILED",
            "Decoded remote static key is not 32 bytes.",
          );
        }
        return { offset: offset + length };
      }

      case "ee":
      case "es":
      case "se":
      case "ss":
        this.performDh(token);
        return { offset };

      case "psk":
        this.ensurePsk();
        this.symmetric.mixKeyAndHash(this.psk!);
        return { offset };
    }
  }

  private performDh(token: Exclude<HandshakeToken, "e" | "s" | "psk">): void {
    const local = this.localPairFor(token);
    const remote = this.remotePublicFor(token);

    if (!local || !remote) {
      throw new NoiseError(
        "NOISE_HANDSHAKE_FAILED",
        `Missing key material for DH token ${token}.`,
      );
    }

    try {
      this.symmetric.mixKey(
        this.crypto.x25519(local.privateKey, remote),
      );
    } catch (error) {
      throw new NoiseError(
        "NOISE_DH_FAILED",
        `DH operation ${token} failed.`,
        { cause: error },
      );
    }
  }

  private localPairFor(
    token: Exclude<HandshakeToken, "e" | "s" | "psk">,
  ): NoiseKeyPair | undefined {
    switch (token) {
      case "ee":
        return this.ephemeralKey;
      case "es":
        return this.role === "initiator" ? this.ephemeralKey : this.staticKey;
      case "se":
        return this.role === "initiator" ? this.staticKey : this.ephemeralKey;
      case "ss":
        return this.staticKey;
    }
  }

  private remotePublicFor(
    token: Exclude<HandshakeToken, "e" | "s" | "psk">,
  ): Uint8Array | undefined {
    switch (token) {
      case "ee":
        return this.remoteEphemeralKey;
      case "es":
        return this.role === "initiator" ? this.remoteStaticKey : this.remoteEphemeralKey;
      case "se":
        return this.role === "initiator" ? this.remoteEphemeralKey : this.remoteStaticKey;
      case "ss":
        return this.remoteStaticKey;
    }
  }

  private mixPreMessages(config: HandshakeStateConfig): void {
    const initiatorKeys = this.pattern.initiatorPreMessage;
    const responderKeys = this.pattern.responderPreMessage;

    if (initiatorKeys.includes("e")) {
      const publicKey = this.role === "initiator"
        ? this.ephemeralKey?.publicKey
        : this.remoteEphemeralKey;
      if (!publicKey) {
        throw new NoiseError(
          "NOISE_INVALID_STATE",
          "Initiator pre-message requires its ephemeral public key.",
        );
      }
      this.symmetric.mixHash(publicKey);
    }

    if (initiatorKeys.includes("s")) {
      const publicKey = this.role === "initiator"
        ? this.staticKey?.publicKey
        : this.remoteStaticKey;
      if (!publicKey) {
        throw new NoiseError(
          "NOISE_INVALID_STATE",
          "Initiator pre-message requires its static public key.",
        );
      }
      this.symmetric.mixHash(publicKey);
    }

    if (responderKeys.includes("e")) {
      const publicKey = this.role === "responder"
        ? this.ephemeralKey?.publicKey
        : this.remoteEphemeralKey;
      if (!publicKey) {
        throw new NoiseError(
          "NOISE_INVALID_STATE",
          "Responder pre-message requires its ephemeral public key.",
        );
      }
      this.symmetric.mixHash(publicKey);
    }

    if (responderKeys.includes("s")) {
      const publicKey = this.role === "responder"
        ? this.staticKey?.publicKey
        : this.remoteStaticKey;
      if (!publicKey) {
        throw new NoiseError(
          "NOISE_INVALID_STATE",
          "Responder pre-message requires its static public key.",
        );
      }
      this.symmetric.mixHash(publicKey);
    }

    void config;
  }

  private validateConcreteKeyRequirements(): void {
    const sent = {
      initiator: new Set<string>(),
      responder: new Set<string>(),
    };

    for (const [index, message] of this.pattern.messages.entries()) {
      const sender = index % 2 === 0 ? "initiator" : "responder";
      for (const token of message) {
        if (token === "e" || token === "s") {
          sent[sender].add(token);
        }
      }
    }

    if (sent.initiator.has("s") && this.role === "initiator" && !this.staticKey) {
      throw new NoiseError("NOISE_INVALID_STATE", "Initiator requires a static key.");
    }
    if (sent.responder.has("s") && this.role === "responder" && !this.staticKey) {
      throw new NoiseError("NOISE_INVALID_STATE", "Responder requires a static key.");
    }
  }

  private ensurePsk(): void {
    if (!this.psk) {
      throw new NoiseError(
        "NOISE_INVALID_STATE",
        "Pattern contains psk but no PSK was provided.",
      );
    }
  }

  private ensureEphemeral(): void {
    if (!this.ephemeralKey) {
      this.ephemeralKey = this.crypto.generateX25519KeyPair();
    }
  }

  private ensureLocalTurn(): void {
    const initiatorTurn = this.messageIndexValue % 2 === 0;
    const localTurn = this.role === "initiator" ? initiatorTurn : !initiatorTurn;

    if (!localTurn) {
      throw new NoiseError(
        "NOISE_INVALID_STATE",
        "It is not this party's turn to write.",
      );
    }
  }

  private ensureRemoteTurn(): void {
    const initiatorTurn = this.messageIndexValue % 2 === 0;
    const localTurn = this.role === "initiator" ? initiatorTurn : !initiatorTurn;

    if (localTurn) {
      throw new NoiseError(
        "NOISE_INVALID_STATE",
        "It is not this party's turn to read.",
      );
    }
  }

  private ensureActive(): void {
    if (this.failedValue) {
      throw new NoiseError("NOISE_HANDSHAKE_FAILED", "Handshake state has failed.");
    }
    if (this.completeValue) {
      throw new NoiseError("NOISE_ALREADY_COMPLETE", "Handshake is already complete.");
    }
  }

  private advance(): void {
    this.messageIndexValue += 1;
    if (this.messageIndexValue >= this.pattern.messages.length) {
      this.completeValue = true;
    }
  }

  private requireBytes(
    input: Uint8Array,
    offset: number,
    length: number,
    label: string,
  ): Uint8Array {
    const value = input.slice(offset, offset + length);
    if (value.byteLength !== length) {
      throw new NoiseError(
        "NOISE_HANDSHAKE_FAILED",
        `Handshake message ended before ${label}.`,
      );
    }
    return value;
  }
}

function cloneKeyPair(
  keyPair: NoiseKeyPair | undefined,
): NoiseKeyPair | undefined {
  if (!keyPair) return undefined;
  return Object.freeze({
    publicKey: keyPair.publicKey.slice(),
    privateKey: keyPair.privateKey.slice(),
  });
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
