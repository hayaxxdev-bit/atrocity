import type {
  ClientPayload,
  ClientPayloadMode,
  DevicePairingData,
  UserAgent,
  WebInfo,
} from "./client-payload-types.js";

export type ClientPayloadBaseConfig = {
  readonly appVersion: {
    readonly primary: number;
    readonly secondary: number;
    readonly tertiary: number;
  };
  readonly countryCode?: string;
  readonly pushName?: string;
  readonly browserName?: string;
  readonly browserDevice?: string;
  readonly browserOsVersion?: string;
  readonly browserOsBuildNumber?: string;
  readonly sessionId?: number;
  readonly connectType?: number;
  readonly connectReason?: number;
  readonly connectAttemptCount?: number;
  readonly shortConnect?: boolean;
};

export type LoginPayloadConfig = ClientPayloadBaseConfig & {
  readonly username: bigint;
  readonly device: number;
  readonly passive?: boolean;
  readonly pull?: boolean;
  readonly lidDbMigrated?: boolean;
};

export type RegistrationPayloadConfig = ClientPayloadBaseConfig & {
  readonly pairing: DevicePairingData;
  readonly passive?: boolean;
  readonly pull?: boolean;
  readonly device?: number;
  readonly product?: number;
  readonly fbCat?: Uint8Array;
  readonly fbUserAgent?: Uint8Array;
  readonly oc?: boolean;
  readonly lc?: number;
};

export function buildClientPayloadBase(
  config: ClientPayloadBaseConfig,
): Pick<ClientPayload,
  "connectType" |
  "connectReason" |
  "userAgent" |
  "webInfo" |
  "pushName" |
  "sessionId" |
  "shortConnect" |
  "connectAttemptCount"
> {
  const userAgent: UserAgent = Object.freeze({
    appVersion: Object.freeze({ ...config.appVersion }),
    platform: "WEB",
    releaseChannel: 0,
    osVersion: config.browserOsVersion ?? "0.1",
    device: config.browserDevice ?? "Desktop",
    osBuildNumber: config.browserOsBuildNumber ?? "0.1",
    localeLanguageIso6391: "en",
    mcc: "000",
    mnc: "000",
    localeCountryIso31661Alpha2: config.countryCode ?? "US",
  });

  const webInfo: WebInfo = Object.freeze({
    webSubPlatform: 0,
  });

  return {
    connectType: config.connectType ?? 0,
    connectReason: config.connectReason ?? 0,
    userAgent,
    webInfo,
    ...(config.pushName === undefined ? {} : { pushName: config.pushName }),
    ...(config.sessionId === undefined ? {} : { sessionId: config.sessionId }),
    ...(config.shortConnect === undefined ? {} : { shortConnect: config.shortConnect }),
    ...(config.connectAttemptCount === undefined
      ? {}
      : { connectAttemptCount: config.connectAttemptCount }),
  };
}

export function buildLoginPayload(
  config: LoginPayloadConfig,
): ClientPayload {
  return Object.freeze({
    ...buildClientPayloadBase(config),
    username: config.username,
    device: config.device,
    passive: config.passive ?? true,
    pull: config.pull ?? true,
    lidDbMigrated: config.lidDbMigrated ?? false,
  });
}

export function buildRegistrationPayload(
  config: RegistrationPayloadConfig,
): ClientPayload {
  return Object.freeze({
    ...buildClientPayloadBase(config),
    passive: config.passive ?? false,
    pull: config.pull ?? false,
    ...(config.device === undefined ? {} : { device: config.device }),
    devicePairingData: config.pairing,
    ...(config.product === undefined ? {} : { product: config.product }),
    ...(config.fbCat === undefined ? {} : { fbCat: config.fbCat.slice() }),
    ...(config.fbUserAgent === undefined
      ? {}
      : { fbUserAgent: config.fbUserAgent.slice() }),
    ...(config.oc === undefined ? {} : { oc: config.oc }),
    ...(config.lc === undefined ? {} : { lc: config.lc }),
  });
}

export function buildPayload(
  mode: ClientPayloadMode,
  config: LoginPayloadConfig | RegistrationPayloadConfig,
): ClientPayload {
  return mode === "login"
    ? buildLoginPayload(config as LoginPayloadConfig)
    : buildRegistrationPayload(config as RegistrationPayloadConfig);
}
