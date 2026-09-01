import type {
  ConnectionCloseSignal,
  ConnectionRecoveryAction,
} from "./connection-close-types";

export type RecoveryCompositionHandlers = {
  reconnect: (signal: ConnectionCloseSignal) => Promise<boolean>;
  reauthenticate: (signal: ConnectionCloseSignal) => Promise<boolean>;
  repairSession: (signal: ConnectionCloseSignal) => Promise<boolean>;
  terminal: (signal: ConnectionCloseSignal) => Promise<boolean>;
};

export type RecoveryCompositionResult = {
  action: ConnectionRecoveryAction;
  recovered: boolean;
  signal: ConnectionCloseSignal;
};
