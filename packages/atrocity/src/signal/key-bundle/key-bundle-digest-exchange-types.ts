export type KeyBundleDigestExchangeStatus =
  | "match"
  | "mismatch"
  | "repair-required";

export type KeyBundleDigestResponse = {
  readonly digest?: Uint8Array;
};

export type KeyBundleDigestExchangeResult = {
  readonly status: KeyBundleDigestExchangeStatus;
  readonly localDigest: Uint8Array;
  readonly serverDigest?: Uint8Array;
};
