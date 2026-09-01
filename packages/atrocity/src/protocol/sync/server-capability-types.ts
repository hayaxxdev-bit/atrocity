export type ServerCapabilityName =
  | "authentication"
  | "iq"
  | "messaging"
  | "presence"
  | "receipts"
  | "media"
  | "groups"
  | "history-sync"
  | "device-sync"
  | "contacts-sync"
  | "experimental";

export type ServerCapability = {
  readonly name: ServerCapabilityName;
  readonly supported: boolean;
  readonly namespace?: string;
  readonly version?: number;
  readonly metadata: Readonly<Record<string, string>>;
};

export type ServerCapabilitySet = Readonly<
  Record<ServerCapabilityName, ServerCapability>
>;
