# ADR-0019 — XEdDSA for Curve25519 Identity Signatures

Signal's XEdDSA uses the X25519/Curve25519 key format for signing and can
therefore share the same key pair format between DH and signatures.

Atrocity adds a dedicated XEd25519 signer rather than mapping X25519 material
through an unrelated Ed25519 keypair.

The implementation remains behind a verification gate until authoritative
XEdDSA vectors pass.
