
import type { ProtocolNode } from "../../protocol/node/index.js";
import type { IqClient } from "../../protocol/iq/index.js";
import type { ManagedPreKey } from "./prekey-pool-types.js";
import { PreKeyPool } from "./prekey-pool.js";
import { WhatsAppPreKeySerializer } from "./whatsapp-prekey-serializer.js";
import { buildEncryptPreKeyUploadIq } from "../../protocol/iq/whatsapp/index.js";

export type PreKeyUploadExecutionResult = {
  readonly status: "uploaded";
  readonly ids: readonly number[];
  readonly iqId: string;
};

export type PreKeyUploadExecutionDependencies = {
  readonly iq: Pick<IqClient, "request">;
  readonly serializer?: WhatsAppPreKeySerializer;
  readonly nextIqId: () => string;
};

export class PreKeyUploadExecutor {
  private readonly serializer: WhatsAppPreKeySerializer;

  constructor(private readonly dependencies: PreKeyUploadExecutionDependencies) {
    this.serializer = dependencies.serializer ?? new WhatsAppPreKeySerializer();
  }

  async execute(pool: PreKeyPool, ids: readonly number[]): Promise<PreKeyUploadExecutionResult> {
    if (ids.length === 0) throw new Error("Pre-key upload requires at least one id.");

    const keys: ManagedPreKey[] = [];
    for (const id of ids) {
      const key = pool.get(id);
      if (!key) throw new Error(`Pre-key ${id} does not exist.`);
      if (key.state !== "pending-upload") {
        throw new Error(`Pre-key ${id} must be pending-upload before execution.`);
      }
      keys.push(key);
    }

    const content: ProtocolNode[] =
      keys.map((key) => this.serializer.serializePreKey(key));

    const iqId = this.dependencies.nextIqId();
    const iq = buildEncryptPreKeyUploadIq(iqId, content);

    await this.dependencies.iq.request(iq);
    pool.markUploaded(ids);

    return Object.freeze({
      status: "uploaded",
      ids: Object.freeze([...ids]),
      iqId,
    });
  }
}
