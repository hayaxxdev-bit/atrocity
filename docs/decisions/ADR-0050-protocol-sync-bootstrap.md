# ADR-0050 — Protocol Bootstrap Boundary

Initial synchronization is represented as an explicit stage machine.

Feature discovery and initial bootstrap are separate from long-term history
sync so later compatibility work can replace exact target messages without
changing the connection lifecycle.
