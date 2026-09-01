# ADR-0010 — Data-Driven Noise HandshakeState

## Decision

The Noise handshake engine interprets a validated pattern at runtime.
The core engine processes Noise tokens while a profile supplies concrete
algorithms, protocol name, prologue, and key material.

## Rationale

Noise revision 34 explicitly models handshake state as reusable state plus
DH keys and message patterns. This keeps target-specific protocol details
out of the engine and permits independent verification.

## Consequence

No WhatsApp-specific constants are introduced into the generic handshake
implementation.
