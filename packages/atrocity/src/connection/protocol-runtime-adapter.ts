export type ProtocolRuntimeAdapter = {
  readonly start(): Promise<void>;
  readonly stop(): Promise<void>;
};

export type ProtocolLifecycleAdapterOptions = {
  readonly protocol: ProtocolRuntimeAdapter;
};

/**
 * Bridges the top-level connection lifecycle to the protocol runtime.
 *
 * ConnectionManager remains the lifecycle owner; this adapter only exposes
 * the stage-specific operations required by the connection orchestration.
 */
export class ConnectionProtocolAdapter {
  constructor(
    private readonly options: ProtocolLifecycleAdapterOptions,
  ) {}

  async startEncryptedProtocol(): Promise<void> {
    await this.options.protocol.start();
  }

  async stopEncryptedProtocol(): Promise<void> {
    await this.options.protocol.stop();
  }
}
