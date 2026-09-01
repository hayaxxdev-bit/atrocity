export type AppVersion = {
  readonly primary: number;
  readonly secondary: number;
  readonly tertiary: number;
};

export type UserAgent = {
  readonly appVersion: AppVersion;
  readonly platform: "WEB" | "ANDROID";
  readonly releaseChannel?: number;
  readonly osVersion?: string;
  readonly device?: string;
  readonly osBuildNumber?: string;
  readonly localeLanguageIso6391?: string;
  readonly mcc?: string;
  readonly mnc?: string;
  readonly localeCountryIso31661Alpha2?: string;
};

export type WebInfo = {
  readonly webSubPlatform?: number;
};

export type DevicePairingData = {
  readonly buildHash: Uint8Array;
  readonly deviceProps: Uint8Array;
  readonly eRegid: Uint8Array;
  readonly eKeytype: Uint8Array;
  readonly eIdent: Uint8Array;
  readonly eSkeyId: Uint8Array;
  readonly eSkeyVal: Uint8Array;
  readonly eSkeySig: Uint8Array;
};

export type ClientPayload = {
  readonly username?: bigint;
  readonly passive?: boolean;
  readonly userAgent?: UserAgent;
  readonly webInfo?: WebInfo;
  readonly pushName?: string;
  readonly sessionId?: number;
  readonly shortConnect?: boolean;
  readonly connectType?: number;
  readonly connectReason?: number;
  readonly shards?: readonly number[];
  readonly dnsSource?: number;
  readonly connectAttemptCount?: number;
  readonly device?: number;
  readonly devicePairingData?: DevicePairingData;
  readonly product?: number;
  readonly fbCat?: Uint8Array;
  readonly fbUserAgent?: Uint8Array;
  readonly oc?: boolean;
  readonly lc?: number;
  readonly lidDbMigrated?: boolean;
  readonly pull?: boolean;
};

export type ClientPayloadMode = "login" | "registration";
