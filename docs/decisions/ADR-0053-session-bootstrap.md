# ADR-0053 — Session Bootstrap as Eligibility Gate

Persisted Signal sessions must pass credential, schema, invariant, and
capability checks before becoming active runtime context.

The bootstrap layer is intentionally not the cryptographic state machine.
Its job is to establish eligibility and provide a stable active-session
record to the session/ratchet implementation.
