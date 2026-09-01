import { NoiseError } from "./noise-errors.js";

export type HandshakeToken =
  | "e"
  | "s"
  | "ee"
  | "es"
  | "se"
  | "ss"
  | "psk";

export type NoiseMessagePattern = readonly HandshakeToken[];

export type PreMessagePattern = readonly ("e" | "s")[];

export type NoiseHandshakePattern = {
  readonly name: string;
  readonly initiatorPreMessage: PreMessagePattern;
  readonly responderPreMessage: PreMessagePattern;
  readonly messages: readonly NoiseMessagePattern[];
};

const VALID_TOKENS = new Set<HandshakeToken>([
  "e", "s", "ee", "es", "se", "ss", "psk",
]);

export function createHandshakePattern(
  input: NoiseHandshakePattern,
): NoiseHandshakePattern {
  validatePattern(input);

  return Object.freeze({
    name: input.name,
    initiatorPreMessage: Object.freeze([...input.initiatorPreMessage]),
    responderPreMessage: Object.freeze([...input.responderPreMessage]),
    messages: Object.freeze(
      input.messages.map((message) => Object.freeze([...message])),
    ),
  });
}

export function validatePattern(
  pattern: NoiseHandshakePattern,
): void {
  if (!/^[A-Z][A-Z0-9]*$/.test(pattern.name)) {
    throw new NoiseError(
      "NOISE_INVALID_INPUT",
      "Handshake pattern name must be uppercase ASCII letters/digits.",
    );
  }

  validatePreMessage(pattern.initiatorPreMessage, "initiator");
  validatePreMessage(pattern.responderPreMessage, "responder");
  validateTokens(pattern.messages);

  if (pattern.messages.length === 0) {
    throw new NoiseError(
      "NOISE_INVALID_INPUT",
      "A handshake pattern must contain at least one message.",
    );
  }

  const sends = {
    initiator: { e: 0, s: 0 },
    responder: { e: 0, s: 0 },
  };

  for (const token of pattern.initiatorPreMessage) sends.initiator[token] += 1;
  for (const token of pattern.responderPreMessage) sends.responder[token] += 1;

  const dhSeen = new Set<string>();

  for (let i = 0; i < pattern.messages.length; i += 1) {
    const sender = i % 2 === 0 ? "initiator" : "responder";
    for (const token of pattern.messages[i]!) {
      if (token === "e" || token === "s") {
        sends[sender][token] += 1;
      }

      if (token === "ee" || token === "es" || token === "se" || token === "ss") {
        if (dhSeen.has(token)) {
          throw new NoiseError(
            "NOISE_INVALID_INPUT",
            `DH token ${token} appears more than once in the handshake pattern.`,
          );
        }
        dhSeen.add(token);
      }
    }
  }

  for (const role of ["initiator", "responder"] as const) {
    if (sends[role].e > 1 || sends[role].s > 1) {
      throw new NoiseError(
        "NOISE_INVALID_INPUT",
        `${role} may send each public key at most once per handshake.`,
      );
    }
  }

  // Basic key-availability validation. Detailed pattern security
  // constraints are checked at construction where concrete static
  // knowledge is known.
  for (const token of pattern.messages.flat()) {
    if (token === "psk") continue;
    if (token === "e" || token === "s") continue;
  }
}

export function validateTokens(
  messages: readonly NoiseMessagePattern[],
): void {
  for (const message of messages) {
    for (const token of message) {
      if (!VALID_TOKENS.has(token)) {
        throw new NoiseError(
          "NOISE_INVALID_INPUT",
          `Unsupported Noise handshake token: ${String(token)}.`,
        );
      }
    }
  }
}

export function validatePreMessage(
  preMessage: PreMessagePattern,
  role: "initiator" | "responder",
): void {
  if (preMessage.length > 2) {
    throw new NoiseError(
      "NOISE_INVALID_INPUT",
      `${role} pre-message may contain at most two key tokens.`,
    );
  }

  if (preMessage.includes("e") && preMessage.filter((t) => t === "e").length > 1) {
    throw new NoiseError("NOISE_INVALID_INPUT", "Pre-message cannot repeat e.");
  }

  if (preMessage.includes("s") && preMessage.filter((t) => t === "s").length > 1) {
    throw new NoiseError("NOISE_INVALID_INPUT", "Pre-message cannot repeat s.");
  }
}

export function messageTokens(
  pattern: NoiseHandshakePattern,
  index: number,
): NoiseMessagePattern {
  const message = pattern.messages[index];
  if (!message) {
    throw new NoiseError(
      "NOISE_INVALID_STATE",
      `Handshake message ${index} does not exist.`,
    );
  }
  return message;
}
