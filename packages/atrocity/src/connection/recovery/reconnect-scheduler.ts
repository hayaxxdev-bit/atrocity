import type { ReconnectPolicy } from "./reconnect-policy-types";
import { ConnectionRecoveryError } from "./connection-recovery-errors";

export type ReconnectScheduler = {
  wait(attempt: number): Promise<number>;
};

export class PolicyReconnectScheduler implements ReconnectScheduler {
  constructor(
    private readonly policy: ReconnectPolicy,
    private readonly sleep: (delayMs: number) => Promise<void> = defaultSleep,
  ) {}

  public async wait(attempt: number): Promise<number> {
    const next = this.policy.next(attempt);

    if (this.policy.isExhausted(attempt)) {
      throw new ConnectionRecoveryError(
        `Reconnect attempts exhausted at attempt ${attempt}.`,
      );
    }

    await this.sleep(next.delayMs);
    return next.delayMs;
  }
}

async function defaultSleep(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
