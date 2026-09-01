import { ConnectionRecoveryError } from "./connection-recovery-errors";
import type { ReconnectPolicy } from "./reconnect-policy-types";
import type { ReconnectScheduler } from "./reconnect-scheduler";

export type ReconnectExecutor = {
  run(): Promise<{
    attempts: number;
    recovered: boolean;
  }>;
};

export type ReconnectExecutorDependencies = {
  connect: () => Promise<void>;
  scheduler: ReconnectScheduler;
  policy: ReconnectPolicy;
};

export class ReconnectExecutorImpl implements ReconnectExecutor {
  constructor(private readonly dependencies: ReconnectExecutorDependencies) {}

  public async run(): Promise<{ attempts: number; recovered: boolean }> {
    let attempt = 1;

    while (true) {
      if (this.dependencies.policy.isExhausted(attempt)) {
        return { attempts: attempt - 1, recovered: false };
      }

      try {
        await this.dependencies.scheduler.wait(attempt);
        await this.dependencies.connect();
        this.dependencies.policy.reset();

        return {
          attempts: attempt,
          recovered: true,
        };
      } catch (error) {
        if (this.dependencies.policy.isExhausted(attempt + 1)) {
          return {
            attempts: attempt,
            recovered: false,
          };
        }

        attempt += 1;

        if (attempt < 1) {
          throw new ConnectionRecoveryError("Reconnect attempt overflow.");
        }
      }
    }
  }
}
