# ADR-0024 — Atomic Ratchet Receive

Ratchet state changes are committed only after message authentication/decrypt
succeeds.

A failed receive restores the exact pre-receive snapshot, including skipped
keys. This prevents authentication failures from causing state drift or
destroying a valid skipped message key.
