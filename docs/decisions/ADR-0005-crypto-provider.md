# ADR-0005 — Crypto Primitive Provider

## Decision

Atrocity cryptographic state machines depend on a `CryptoProvider`
abstraction rather than importing Node crypto APIs directly.

## Initial implementation

Node.js `node:crypto` is the first backend.

## Rationale

This keeps cryptographic protocol logic testable and replaceable while
making runtime-specific primitive choices explicit.

## Security posture

Atrocity does not claim that implementing primitives alone makes the
protocol secure. Noise and Signal correctness still depends on exact
protocol state transitions and interoperability verification.
