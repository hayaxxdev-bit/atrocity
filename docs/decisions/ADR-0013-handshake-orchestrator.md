# ADR-0013 — Handshake Orchestration Boundary

## Decision

Handshake sequencing is represented by a dedicated orchestrator with
injected transport, codec, Noise state, payload factory, and encryption
functions.

## Rationale

The current Baileys socket implementation combines these concerns in the
socket lifecycle. Atrocity keeps them separated so each stage can be
independently tested and replaced.

## Consequence

The orchestrator can be tested entirely in memory. Live protocol behavior
must be proven separately.
