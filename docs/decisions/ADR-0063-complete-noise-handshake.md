# ADR-0063 — Handshake Orchestration Is Not Cryptographic Ownership

A single WhatsAppNoiseHandshake state machine owns handshake sequencing but
delegates cryptography, certificate handling, payload construction, and wire
encoding to specialized components.

This makes the full transcript testable without creating a monolithic
cryptographic implementation.
