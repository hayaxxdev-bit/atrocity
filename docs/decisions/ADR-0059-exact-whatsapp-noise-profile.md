# ADR-0059 — Reference-Driven Noise Profile

The WhatsApp Noise profile is represented explicitly and versioned through
reference fixtures.

Profile constants are separated from the actual handshake state machine so a
WhatsApp version change can be detected as a compatibility diff without
rewriting generic Noise primitives.
