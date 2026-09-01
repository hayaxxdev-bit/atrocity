# ADR-0007 — Noise Symmetric State Before Target Profile

Atrocity implements the reusable Noise symmetric/cipher mechanics before
introducing a target-specific handshake pattern.

The separation follows the Noise Framework model:
`CipherState` → `SymmetricState` → `HandshakeState`.

A target protocol may select a pattern, DH, cipher, hash, prologue, and
protocol-specific messages later, without making those concerns intrinsic
to the reusable engine.
