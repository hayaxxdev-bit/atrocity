export type ClientHello = { readonly ephemeral: Uint8Array };
export type ServerHello = {
  readonly ephemeral: Uint8Array;
  readonly static?: Uint8Array;
  readonly payload?: Uint8Array;
};
export type ClientFinish = {
  readonly static: Uint8Array;
  readonly payload: Uint8Array;
};
export type HandshakeMessage =
  | { readonly type: "clientHello"; readonly clientHello: ClientHello }
  | { readonly type: "serverHello"; readonly serverHello: ServerHello }
  | { readonly type: "clientFinish"; readonly clientFinish: ClientFinish };

export type HandshakeDecodeLimits = {
  readonly maxMessageBytes: number;
  readonly maxFieldBytes: number;
};

export const DEFAULT_HANDSHAKE_DECODE_LIMITS: HandshakeDecodeLimits = Object.freeze({
  maxMessageBytes: 16 * 1024 * 1024,
  maxFieldBytes: 4 * 1024 * 1024,
});
