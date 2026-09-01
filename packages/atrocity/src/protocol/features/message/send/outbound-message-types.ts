export type OutboundMessageKind = "text" | "raw";
export type OutboundRecipientDevice = { readonly jid: string; readonly device?: number };
export type OutboundMessageInput = { readonly id: string; readonly remoteJid: string; readonly type: OutboundMessageKind; readonly plaintext: Uint8Array };
export type OutboundMessageSendResult = { readonly status: "sent"; readonly id: string; readonly remoteJid: string; readonly deviceCount: number; readonly node: import("../../../node/index.js").ProtocolNode };
