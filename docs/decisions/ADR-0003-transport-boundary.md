# ADR-0003 — Transport Boundary

## Decision

Atrocity defines a transport abstraction that moves opaque byte payloads
and owns transport lifecycle. Protocol, Noise, authentication, and
application logic are not dependencies of the transport.

## Rationale

This prevents the WebSocket implementation from becoming the owner of
protocol semantics and keeps transport replaceable/testable.

## Consequence

WebSocket will be an adapter over this boundary in M1.8. An in-memory
implementation is retained for deterministic unit tests.
