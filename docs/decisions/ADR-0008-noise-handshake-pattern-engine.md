# ADR-0008 — Generic Noise Handshake Pattern Engine

## Decision

Noise handshake token execution is represented as a data-driven pattern
rather than hard-coded branches for a single protocol.

## Rationale

Noise revision 34 defines handshake patterns as message sequences made from
named tokens. This lets Atrocity separate the reusable HandshakeState from
the target-specific profile.

## Consequence

WhatsApp-specific pattern/prologue/pre-message details will be supplied
later as a verified profile. The generic engine remains reusable and
independently testable.
