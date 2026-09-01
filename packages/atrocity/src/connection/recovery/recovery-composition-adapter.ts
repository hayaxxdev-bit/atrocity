import type { ConnectionCloseSignal } from "./connection-close-types";
import type { RecoveryCompositionHandlers } from "./recovery-composition-types";

export type RecoveryCompositionAdapterDependencies =
  RecoveryCompositionHandlers;

/**
 * Explicit wiring adapter.
 *
 * This layer intentionally contains no recovery semantics. Callers decide
 * whether an action is backed by M2.31, M2.32, a session-repair orchestrator,
 * or a terminal shutdown boundary.
 */
export class RecoveryCompositionAdapterFactory {
  public static create(
    dependencies: RecoveryCompositionAdapterDependencies,
  ): RecoveryCompositionHandlers {
    return {
      reconnect: (signal: ConnectionCloseSignal) =>
        dependencies.reconnect(signal),
      reauthenticate: (signal: ConnectionCloseSignal) =>
        dependencies.reauthenticate(signal),
      repairSession: (signal: ConnectionCloseSignal) =>
        dependencies.repairSession(signal),
      terminal: (signal: ConnectionCloseSignal) =>
        dependencies.terminal(signal),
    };
  }
}
