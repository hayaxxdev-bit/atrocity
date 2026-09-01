# ADR-0016 — Distinct Ed25519 Identity Signing

Atrocity uses Ed25519 for identity signatures and X25519 for key agreement.
These are separate cryptographic roles and are represented separately in
the credential model.

The signed-pre-key signature is generated and verified through CryptoProvider.
No hash is used as a signature substitute.
