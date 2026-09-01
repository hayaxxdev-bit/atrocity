# ADR-0004 — WebSocket as a Transport Adapter

## Decision

WebSocket is implemented as an adapter over the generic Atrocity
`Transport` contract. The adapter only transports opaque bytes.

## Rationale

Protocol and security layers should remain independent of the concrete
network implementation. This allows deterministic testing and future
transport replacement.

## Consequence

The WebSocket adapter is unaware of WABinary, Noise, Signal, and
authentication. Tests use an injected fake socket rather than a network.
