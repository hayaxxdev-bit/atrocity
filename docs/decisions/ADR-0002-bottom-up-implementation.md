# ADR-0002 — Bottom-up Implementation

Status: Accepted

## Decision

Implementation starts from low-level primitives and moves upward toward the public client API.

Planned sequence:

1. Repository/toolchain
2. Error/result primitives
3. Byte primitives
4. Protocol node model
5. Binary reader/writer
6. Node codec
7. Transport abstraction
8. WebSocket transport
9. Crypto provider
10. Noise engine

## Rationale

The public API should emerge from tested internal contracts rather than force premature abstractions onto unimplemented subsystems.
