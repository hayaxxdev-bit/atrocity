# ADR-0043 — Protocol Runtime Composition Root

ProtocolRuntime is the protocol-layer composition root.

It composes IQ correlation, node routing, and feature lifecycle without
becoming the owner of transport or connection lifecycle.

This creates a single integration point for future protocol features.
