export type NoiseTranscriptMessage = {
  readonly name:
    | "clientHello"
    | "serverHello"
    | "clientFinish";
  readonly encoded: Uint8Array;
};

export type NoiseTranscriptCheckpoint = {
  readonly handshakeHash: Uint8Array;
  readonly chainingKey: Uint8Array;
};

export class NoiseTranscript {
  private readonly messages: NoiseTranscriptMessage[] = [];

  append(
    name: NoiseTranscriptMessage["name"],
    encoded: Uint8Array,
  ): void {
    this.messages.push(Object.freeze({
      name,
      encoded: encoded.slice(),
    }));
  }

  list(): readonly NoiseTranscriptMessage[] {
    return Object.freeze(
      this.messages.map((message) => Object.freeze({
        name: message.name,
        encoded: message.encoded.slice(),
      })),
    );
  }

  get length(): number {
    return this.messages.length;
  }

  checkpoint(
    handshakeHash: Uint8Array,
    chainingKey: Uint8Array,
  ): NoiseTranscriptCheckpoint {
    return Object.freeze({
      handshakeHash: handshakeHash.slice(),
      chainingKey: chainingKey.slice(),
    });
  }
}
