# ADR-0023 — MKSKIPPED Bounded Store

Skipped message keys are stored by `(remote ratchet public key, message
number)` and consumed exactly once.

The store enforces both a global maximum and a per-chain maximum. This
provides a concrete implementation of the Double Ratchet `MAX_SKIP` safety
boundary and prevents unbounded attacker-controlled key derivation.
