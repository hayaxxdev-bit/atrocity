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

export type RatchetMessageHeader = {
  readonly dh: Uint8Array;
  readonly pn: bigint;
  readonly n: bigint;
};

export type DHRatchetResult = {
  readonly rootKey: Uint8Array;
  readonly sendingChainKey: Uint8Array;
  readonly receivingChainKey: Uint8Array;
  readonly previousSendingChainLength: bigint;
  readonly remoteRatchetPublicKey: Uint8Array;
};

/**
 * M1.26 DH-ratchet state.
 *
 * The implementation follows the core Signal state transition:
 * receive a new remote ratchet public key -> preserve skipped count
 * -> DH with the new remote key -> KDF_RK -> new receiving chain ->
 * generate a new local ratchet key -> DH again -> KDF_RK -> new
 * sending chain.
 *
 * Header parsing and skipped-key storage are deliberately outside this
 * class.
 */
export class DHRatchet {
  private readonly crypto: CryptoProvider;
  private readonly root: RootKeyStateMachine;

  private sending?: RatchetChain;
  private receiving?: RatchetChain;

  private dhs: RatchetKeyPair;
  private dhr?: Uint8Array;

  private ns = 0n;
  private nr = 0n;
  private pn = 0n;

  constructor(
    crypto: CryptoProvider,
    rootKey: Uint8Array,
    localRatchetKey: RatchetKeyPair,
    options: {
      readonly remoteRatchetPublicKey?: Uint8Array;
      readonly sendingChainKey?: Uint8Array;
      readonly receivingChainKey?: Uint8Array;
      readonly sendCount?: bigint;
      readonly receiveCount?: bigint;
      readonly previousSendingChainLength?: bigint;
    } = {},
  ) {
    if (localRatchetKey.privateKey.byteLength !== 32 ||
        localRatchetKey.publicKey.byteLength !== 32) {
      throw new RatchetError(
        "RATCHET_INVALID_KEY",
        "Local ratchet key pair must use 32-byte X25519 keys.",
      );
    }

    this.crypto = crypto;
    this.root = new RootKeyStateMachine(crypto, rootKey);
    this.dhs = cloneKeyPair(localRatchetKey)!;
    this.dhr = options.remoteRatchetPublicKey?.slice();

    if (options.sendingChainKey) {
      this.sending = new RatchetChain(
        crypto,
        options.sendingChainKey,
        options.sendCount ?? 0n,
      );
    }

    if (options.receivingChainKey) {
      this.receiving = new RatchetChain(
        crypto,
        options.receivingChainKey,
        options.receiveCount ?? 0n,
      );
    }

    this.ns = options.sendCount ?? 0n;
    this.nr = options.receiveCount ?? 0n;
    this.pn = options.previousSendingChainLength ?? 0n;
  }

  get state(): DoubleRatchetState {
    const output: DoubleRatchetState = {
      rootKey: this.root.state,
      ...(this.sending ? { sendingChain: this.sending.state } : {}),
      ...(this.receiving ? { receivingChain: this.receiving.state } : {}),
      sendRatchetKey: cloneKeyPair(this.dhs)!,
      ...(this.dhr ? { remoteRatchetPublicKey: this.dhr.slice() } : {}),
      sendCount: this.ns,
      receiveCount: this.nr,
      previousSendingChainLength: this.pn,
    };

    return Object.freeze(output);
  }

  get localRatchetPublicKey(): Uint8Array {
    return this.dhs.publicKey.slice();
  }

  get remoteRatchetPublicKey(): Uint8Array | undefined {
    return this.dhr?.slice();
  }

  nextSendingMessageKey(): MessageKey {
    if (!this.sending) {
      throw new RatchetError(
        "RATCHET_MESSAGE_KEY_UNAVAILABLE",
        "Sending chain is not initialized.",
      );
    }

    const key = this.sending.nextMessageKey();
    this.ns += 1n;
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
    this.nr += 1n;
    return key;
  }

  /**
   * Performs the complete DH ratchet transition after a new remote
   * ratchet public key is received.
   */
  receiveNewRatchetKey(
    remotePublicKey: Uint8Array,
  ): DHRatchetResult {
    validatePublicKey(remotePublicKey);

    if (this.dhr && equalBytes(this.dhr, remotePublicKey)) {
      throw new RatchetError(
        "RATCHET_INVALID_STATE",
        "The supplied remote ratchet public key is already current.",
      );
    }

    this.pn = this.ns;
    this.ns = 0n;
    this.nr = 0n;
    this.dhr = remotePublicKey.slice();

    // Step 1: derive a fresh receiving chain from old DHs and new DHr.
    const receivingDh = this.crypto.x25519(
      this.dhs.privateKey,
      this.dhr,
    );
    const receivingChain = this.root.ratchet(receivingDh);

    this.receiving = new RatchetChain(
      this.crypto,
      receivingChain,
    );

    // Step 2: replace the local ratchet key, then derive a fresh
    // sending chain from the new local key and the same remote key.
    this.dhs = cloneKeyPair(
      this.crypto.generateX25519KeyPair(),
    )!;

    const sendingDh = this.crypto.x25519(
      this.dhs.privateKey,
      this.dhr,
    );
    const sendingChain = this.root.ratchet(sendingDh);

    this.sending = new RatchetChain(
      this.crypto,
      sendingChain,
    );

    return Object.freeze({
      rootKey: this.root.state.key,
      sendingChainKey: sendingChain.slice(),
      receivingChainKey: receivingChain.slice(),
      previousSendingChainLength: this.pn,
      remoteRatchetPublicKey: this.dhr.slice(),
    });
  }

  createHeader(): RatchetMessageHeader {
    return Object.freeze({
      dh: this.dhs.publicKey.slice(),
      pn: this.pn,
      n: this.ns,
    });
  }
}

function validatePublicKey(value: Uint8Array): void {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new RatchetError(
      "RATCHET_INVALID_KEY",
      "Remote ratchet public key must be exactly 32 bytes.",
    );
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

function equalBytes(
  a: Uint8Array,
  b: Uint8Array,
): boolean {
  if (a.byteLength !== b.byteLength) return false;

  let difference = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    difference |= a[i]! ^ b[i]!;
  }
  return difference === 0;
}
