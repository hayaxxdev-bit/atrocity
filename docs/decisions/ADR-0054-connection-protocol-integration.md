# ADR-0054 — Connection Owns Protocol Lifecycle

ProtocolRuntime must not independently decide when the connection is ready or
when the transport should close.

ConnectionManager controls the global order. A small adapter bridges to
ProtocolRuntime so the ownership remains explicit.
