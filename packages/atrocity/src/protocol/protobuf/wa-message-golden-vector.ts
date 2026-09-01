import type { WAMessage } from "./wa-message-types.js";

export type WAMessageGoldenVector = {
  readonly id: string;
  readonly message: WAMessage;
  readonly expectedHex: string;
};

export function createWAMessageGoldenVector(
  id: string,
  message: WAMessage,
  expectedHex: string,
): WAMessageGoldenVector {
  return Object.freeze({ id, message, expectedHex });
}
