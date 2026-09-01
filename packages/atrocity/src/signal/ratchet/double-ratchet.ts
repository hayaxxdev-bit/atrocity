import type { CryptoProvider } from "../../crypto/index.js";
import { RatchetError } from "./ratchet-errors.js";
import { RatchetChain } from "./chain-state.js";
import { RootKeyStateMachine } from "./root-state.js";
import type {
  ChainKeyState,
  DoubleRatchetState,
  MessageKey,
  RatchetKeyPair,
} from "./ratchet-types.js";

/**
 * M1.25 root/chain-only Double Ratchet state.
 *
 * DH-ratchet transitions, skipped message keys, and message headers are
 * intentionally deferred to later milestones.
 */
/** @deprecated Use DHRatchet for actual DH transitions. */
    export class DoubleRatchetCore {
  private readonly crypto: CryptoProvider;
  private readonly rootState: RootKeyStateMachine;
  private sending?: RatchetChain;
  private receiving?: RatchetChain;
  private sendKey?: RatchetKeyPair;
  private remotePublicKey?: Uint8Array;

  private sendCountValue = 0n;
  private receiveCountValue = 0n;
  private previousSendingChainLengthValue = 0n;

  constructor(
    crypto: CryptoProvider,
    initialRootKey: Uint8Array,
    options: {
      readonly sendingChainKey?: Uint8Array;
      readonly receivingChainKey?: Uint8Array;
      readonly sendRatchetKey?: RatchetKeyPair;
      readonly remoteRatchetPublicKey?: Uint8Array;
    } = {},
  ) {
    this.crypto = crypto;
    this.rootState = new RootKeyStateMachine(
      crypto,
      initialRootKey,
    );

    if (options.sendingChainKey) {
      this.sending = new RatchetChain(
        crypto,
        options.sendingChainKey,
      );
    }

    if (options.receivingChainKey) {
      this.receiving = new RatchetChain(
        crypto,
        options.receivingChainKey,
      );
    }

    this.sendKey = cloneKeyPair(options.sendRatchetKey);
    this.remotePublicKey = options.remoteRatchetPublicKey?.slice();
  }

  get state(): DoubleRatchetState {
    return Object.freeze({
      rootKey: this.rootState.state,
      ...(this.sending ? { sendingChain: this.sending.state } : {}),
      ...(this.receiving ? { receivingChain: this.receiving.state } : {}),
      ...(this.sendKey ? { sendRatchetKey: cloneKeyPair(this.sendKey)! } : {}),
      ...(this.remotePublicKey
        ? { remoteRatchetPublicKey: this.remotePublicKey.slice() }
        : {}),
      sendCount: this.sendCountValue,
      receiveCount: this.receiveCountValue,
      previousSendingChainLength: this.previousSendingChainLengthValue,
    });
  }

  initializeSendingChain(chainKey: Uint8Array): void {
    this.sending = new RatchetChain(this.crypto, chainKey);
    this.sendCountValue = 0n;
  }

  initializeReceivingChain(chainKey: Uint8Array): void {
    this.receiving = new RatchetChain(this.crypto, chainKey);
    this.receiveCountValue = 0n;
  }

  nextSendingMessageKey(): MessageKey {
    if (!this.sending) {
      throw new RatchetError(
        "RATCHET_MESSAGE_KEY_UNAVAILABLE",
        "Sending chain is not initialized.",
      );
    }

    const key = this.sending.nextMessageKey();
    this.sendCountValue += 1n;
    return key;
  }

  nextReceivingMessageKey(): MessageKey {
    if (!this.receiving) {
      throw new RatchetError(
        "RATCHET_MESSAGE_KEY_UNAVAILABLE",
        "Receiving chain is not initialized.",
      );
    }

    const key = this.receiving.nextMessageKey();
    this.receiveCountValue += 1n;
    return key;
  }

  ratchetRoot(dhOutput: Uint8Array): Uint8Array {
    const chainKey = this.rootState.ratchet(dhOutput);
    this.previousSendingChainLengthValue = this.sendCountValue;
    this.initializeReceivingChain(chainKey);
    this.initializeSendingChain(
      this.crypto.hkdf(
        "SHA-256",
        dhOutput,
        this.rootState.state.key,
        new TextEncoder().encode("Signal_Ratchet_SendChain"),
        32,
      ),
    );
    return chainKey;
  }

  setRemoteRatchetPublicKey(publicKey: Uint8Array): void {
    if (publicKey.byteLength !== 32) {
      throw new RatchetError(
        "RATCHET_INVALID_KEY",
        "Remote ratchet public key must be exactly 32 bytes.",
      );
    }
    this.remotePublicKey = publicKey.slice();
  }
}

function cloneKeyPair(
  keyPair: RatchetKeyPair | undefined,
): RatchetKeyPair | undefined {
  if (!keyPair) return undefined;
  return Object.freeze({
    publicKey: keyPair.publicKey.slice(),
    privateKey: keyPair.privateKey.slice(),
  });
}
