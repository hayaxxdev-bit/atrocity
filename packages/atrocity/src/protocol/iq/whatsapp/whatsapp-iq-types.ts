export const WHATSAPP_SERVER = "s.whatsapp.net";

export type WhatsAppIqNamespace =
  | "encrypt"
  | "passive"
  | "usync"
  | "md"
  | "w:stats"
  | "w:mex";

export type WhatsAppIqRequest = {
  readonly namespace: WhatsAppIqNamespace;
  readonly node: import("../../node/index.js").ProtocolNode;
};
