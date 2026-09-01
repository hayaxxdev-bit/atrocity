# ADR-0020 — Canonical Curve25519 Signal Identity

Use one Curve25519/X25519 identity key pair for the Signal identity domain.
Use XEd25519/XEdDSA-compatible signing for signed-pre-key authentication.

This eliminates the previous split-key identity ambiguity and keeps DH and
signature representations cryptographically linked.
