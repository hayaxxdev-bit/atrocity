# ADR-0075 — Separate Rotation Policy From Digest Reconciliation

Signed pre-key generation/rotation and server key-bundle reconciliation are
separate responsibilities.

The local digest implementation is deterministic and public-material-only, but
must not be treated as the exact server digest until reference vectors prove
the serialization/algorithm.
