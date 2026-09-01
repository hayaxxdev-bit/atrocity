import type { HandshakeMessage } from "./handshake-types.js";
import {
  buildWhatsAppClientFinish,
} from "./whatsapp-client-finish.js";

export type ClientFinishComposer = {
  readonly encryptPayload: (
    payload: Uint8Array,
  ) => Uint8Array;
};

export function composeWhatsAppClientFinish(
  encryptedStatic: Uint8Array,
  clientPayload: Uint8Array,
  composer: ClientFinishComposer,
): HandshakeMessage {
  const encryptedPayload =
    composer.encryptPayload(clientPayload);

  return buildWhatsAppClientFinish({
    encryptedStatic,
    encryptedPayload,
  });
}
