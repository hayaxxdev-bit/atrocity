# ADR-0051 — Capability-Gated Protocol Features

Protocol features may declare server capability requirements.

Capability detection is derived from bootstrap discovery and is used to gate
feature activation.

This avoids starting feature code that the negotiated server profile cannot
support while keeping capability inference outside individual features.
