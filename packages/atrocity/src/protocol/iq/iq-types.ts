import type { ProtocolNode } from "../node/index.js";

export type IqType = "get" | "set" | "result" | "error";

export type IqRequest = {
  readonly id: string;
  readonly type: Exclude<IqType, "result" | "error">;
  readonly to?: string;
  readonly content?: readonly unknown[];
};

export type IqResponse = {
  readonly id: string;
  readonly type: Extract<IqType, "result" | "error">;
  readonly node: ProtocolNode;
};

export type PendingIq = {
  readonly id: string;
  readonly createdAt: number;
  readonly timeoutAt: number;
  readonly resolve: (node: ProtocolNode) => void;
  readonly reject: (error: unknown) => void;
};

export type IqRequestOptions = {
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
};
