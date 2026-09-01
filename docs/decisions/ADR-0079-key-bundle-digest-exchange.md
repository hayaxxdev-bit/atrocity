# ADR-0079 — Digest Exchange Separates Observation From Repair

The digest query only observes and classifies key-bundle state.

Repair/upload is a separate operation. This prevents a read operation from
silently mutating local or remote key material.
