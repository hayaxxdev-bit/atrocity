import { protocolNode, type ProtocolNode } from "../node/index.js";

export type WhatsAppStreamOpenConfig = {
  readonly domain: string;
  readonly version: readonly [number, number, number];
  readonly client?: string;
  readonly connectType?: string;
  readonly connectReason?: string;
  readonly devicePairing?: string;
  readonly passive?: boolean;
};

export function buildWhatsAppStreamOpen(
  config: WhatsAppStreamOpenConfig,
): ProtocolNode {
  const attrs: Record<string, string> = {
    to: config.domain,
    version: config.version.join("."),
    client: config.client ?? "WhatsApp Web",
  };

  if (config.connectType !== undefined) attrs.connect_type = config.connectType;
  if (config.connectReason !== undefined) attrs.connect_reason = config.connectReason;
  if (config.devicePairing !== undefined) attrs.device = config.devicePairing;
  if (config.passive !== undefined) attrs.passive = config.passive ? "true" : "false";

  return protocolNode("stream:open", attrs);
}
