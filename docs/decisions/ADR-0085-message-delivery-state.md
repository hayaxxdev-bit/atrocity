# ADR-0085 — Delivery State Is Independent From Signal Encryption

Signal encryption establishes ciphertext.

Delivery tracking establishes transport/server lifecycle.

Receipt interpretation is target-specific and feeds a generic delivery state
machine. Retry execution is delegated to a separate executor.
