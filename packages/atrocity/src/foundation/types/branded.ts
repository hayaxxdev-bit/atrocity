/** Utility for creating nominal string types without runtime overhead. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type RuntimeId = Brand<string, "RuntimeId">;
export type SessionId = Brand<string, "SessionId">;
export type ConnectionId = Brand<string, "ConnectionId">;
