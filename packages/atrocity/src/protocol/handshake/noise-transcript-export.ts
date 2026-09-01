import type {
  WhatsAppNoiseHandshakeSnapshot,
} from "./whatsapp-noise-handshake.js";

export type WhatsAppHandshakeTranscript = {
  readonly clientHello: Uint8Array;
  readonly serverHello: Uint8Array;
  readonly clientFinish: Uint8Array;
  readonly stage: WhatsAppNoiseHandshakeSnapshot["stage"];
};

export function transcriptFromSnapshot(
  snapshot: WhatsAppNoiseHandshakeSnapshot,
  serverHello: Uint8Array,
): WhatsAppHandshakeTranscript {
  const clientHello =
    snapshot.sent.find((entry) => entry.type === "clientHello");
  const clientFinish =
    snapshot.sent.find((entry) => entry.type === "clientFinish");

  if (!clientHello || !clientFinish) {
    throw new Error(
      "Handshake snapshot is missing ClientHello or ClientFinish.",
    );
  }

  return Object.freeze({
    clientHello: clientHello.bytes.slice(),
    serverHello: serverHello.slice(),
    clientFinish: clientFinish.bytes.slice(),
    stage: snapshot.stage,
  });
}
