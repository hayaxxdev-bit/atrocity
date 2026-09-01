# ADR-0017 — One-Time Pre-Key Ownership

The pre-key store owns one-time pre-key lifecycle. Bundle construction reads a
public key snapshot; consuming a one-time pre-key removes it from the durable
store.

Private key material is never returned as part of a public `PreKeyBundle`.
