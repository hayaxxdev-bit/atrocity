# ADR-0026 — Logical Message vs Wire Envelope

Signal message semantics are separated from binary serialization.

The ratchet/AEAD layer produces a logical message. The wire codec translates
that logical message into bytes and owns versioning, validation, and malformed
input behavior.

The current M1.30 encoding is internal and must not be represented as
official WhatsApp wire compatibility.
