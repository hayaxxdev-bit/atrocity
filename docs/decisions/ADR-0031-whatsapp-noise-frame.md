# ADR-0031 — Target-Specific Noise Frame Adapter

Noise transport encryption and WhatsApp frame framing are separate concerns.

`WhatsAppNoiseTransport` composes:
- a Noise transport cipher
- a WhatsApp target header
- a frame codec

This prevents WhatsApp framing assumptions from leaking into the generic
Noise implementation.
