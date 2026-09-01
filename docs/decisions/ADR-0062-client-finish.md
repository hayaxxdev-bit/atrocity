# ADR-0062 — ClientFinish Structure Is Separate From Encryption

ClientFinish construction is a target adapter around two already-produced
encrypted fields.

Noise encryption and WAProto serialization remain injected concerns. This
keeps the handshake adapter deterministic and vector-testable.
