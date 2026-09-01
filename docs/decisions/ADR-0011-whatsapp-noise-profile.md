# ADR-0011 — Isolate WhatsApp Noise Profile

WhatsApp-specific Noise constants are isolated in a target profile rather
than hard-coded into the generic engine.

Current reference values are taken from the current Baileys source, but
live compatibility is not declared until the complete handshake and
transport sequence passes interoperability testing.
