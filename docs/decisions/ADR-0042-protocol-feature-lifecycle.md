# ADR-0042 — Protocol Feature Lifecycle

Protocol features are dependency-aware modules with explicit start/stop
lifecycle.

The manager provides:
- dependency ordering
- activation
- reverse-order shutdown
- startup rollback

This allows the connection layer to activate protocol features without giving
individual features ownership of global connection lifecycle.
