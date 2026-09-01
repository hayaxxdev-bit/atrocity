# ADR-0068 — Authenticated Stream Runtime Boundary

The authenticated stream lifecycle is modeled separately from both the global
connection lifecycle and protocol feature lifecycle.

This gives the client a clean transition:
authenticated transport → negotiated stream → protocol ready.
