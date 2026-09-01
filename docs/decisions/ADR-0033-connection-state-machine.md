# ADR-0033 — Top-Level Connection State Machine

The connection lifecycle is centralized in `ConnectionManager`.

Lower layers expose capabilities; they do not coordinate global lifecycle.

This prevents transport, authentication, and protocol layers from independently
trying to reconnect or close the same connection.
