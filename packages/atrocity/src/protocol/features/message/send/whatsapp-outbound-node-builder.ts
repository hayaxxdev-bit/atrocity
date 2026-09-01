import { protocolNode, type ProtocolNode } from "../../../node/index.js";
import type { OutboundMessageInput } from "./outbound-message-types.js";
export class WhatsAppOutboundNodeBuilder {
  build(input: OutboundMessageInput, encrypted: readonly ProtocolNode[]): ProtocolNode {
    return protocolNode("message", { id: input.id, to: input.remoteJid, type: input.type === "raw" ? "text" : input.type }, { kind:"nodes", value:[...encrypted] });
  }
}
