import { SkippedMessageKeyStore, type SkippedKeyStoreSnapshot } from "./skipped-key-store.js";
import type { DoubleRatchetState } from "./ratchet-types.js";

export type RatchetTransactionSnapshot = {
  readonly state: DoubleRatchetState;
  readonly skipped: SkippedKeyStoreSnapshot;
};

export class RatchetTransaction {
  private committed = false;

  constructor(
    private readonly restoreState: (state: DoubleRatchetState) => void,
    private readonly state: DoubleRatchetState,
    private readonly skippedStore: SkippedMessageKeyStore,
  ) {}

  snapshot(): RatchetTransactionSnapshot {
    return Object.freeze({
      state: cloneState(this.state),
      skipped: this.skippedStore.snapshot(),
    });
  }

  commit(): void {
    this.committed = true;
  }

  rollback(): void {
    if (this.committed) return;
    this.restoreState(this.state);
    this.skippedStore.restore(
      this.skippedStore.snapshot(),
    );
  }
}

function cloneState(state: DoubleRatchetState): DoubleRatchetState {
  return Object.freeze({
    rootKey: Object.freeze({
      key: state.rootKey.key.slice(),
      generation: state.rootKey.generation,
    }),
    ...(state.sendingChain
      ? {
          sendingChain: Object.freeze({
            key: state.sendingChain.key.slice(),
            index: state.sendingChain.index,
          }),
        }
      : {}),
    ...(state.receivingChain
      ? {
          receivingChain: Object.freeze({
            key: state.receivingChain.key.slice(),
            index: state.receivingChain.index,
          }),
        }
      : {}),
    ...(state.sendRatchetKey
      ? {
          sendRatchetKey: Object.freeze({
            publicKey: state.sendRatchetKey.publicKey.slice(),
            privateKey: state.sendRatchetKey.privateKey.slice(),
          }),
        }
      : {}),
    ...(state.remoteRatchetPublicKey
      ? { remoteRatchetPublicKey: state.remoteRatchetPublicKey.slice() }
      : {}),
    sendCount: state.sendCount,
    receiveCount: state.receiveCount,
    previousSendingChainLength: state.previousSendingChainLength,
    skippedMessageKeyCount: state.skippedMessageKeyCount,
  });
}
