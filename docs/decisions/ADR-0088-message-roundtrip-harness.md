# ADR-0088 — Integration Harness Must Exercise Real Boundaries

The round-trip harness composes serialization, Signal encryption/decryption,
WhatsApp envelope construction, delivery state, and session commit.

No internal layer is bypassed by directly calling its implementation details.
