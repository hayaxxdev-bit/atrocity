# ADR-0006 — Generic Noise Engine Before Target Profile

## Decision

Implement the Noise state-machine boundary independently of any
WhatsApp-specific profile.

## Rationale

This avoids coupling generic handshake mechanics to target protocol
details and gives us deterministic test coverage before interoperability
work begins.

## Consequence

The current test profile is intentionally not wire-compatible with
WhatsApp. A separate target profile must be verified against authoritative
protocol evidence before it is introduced.
