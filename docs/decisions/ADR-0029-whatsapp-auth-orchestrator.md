# ADR-0029 — WhatsApp Authentication as Target Adapter

WhatsApp authentication is a target-specific orchestration service above the
generic Noise, protobuf, credentials, and persistence layers.

The service owns sequencing, not cryptography or serialization.

This keeps Atrocity's core reusable while allowing WhatsApp-specific handshake
behavior to evolve independently.
