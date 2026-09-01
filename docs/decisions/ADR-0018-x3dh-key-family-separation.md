# ADR-0018 — X25519 Identity for DH, Separate Signing Primitive

X3DH requires all DH-participating keys to be from the same curve family.
Atrocity therefore uses an X25519 identity key for DH.

Signed-pre-key authentication is represented through a separate verifier
boundary. The concrete target profile must supply the exact signing semantics
(e.g. XEdDSA-compatible behavior) before live Signal/WhatsApp interoperability
is claimed.
