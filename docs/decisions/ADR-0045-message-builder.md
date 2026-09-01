# ADR-0045 — Outbound Message Builder

Outbound message construction is isolated from transport.

MessageNodeBuilder creates protocol nodes. MessageApi delegates those nodes
to a sender.

This keeps serialization/protocol construction independently testable and
allows the target-specific WhatsApp message shape to evolve without touching
the transport layer.
