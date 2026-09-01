# ADR-0030 — Explicit Noise Finish Adapter

The exact result of WhatsApp's server-side Noise processing is represented by
an injected `processServerHello()` adapter.

The authenticator never fabricates `clientFinish.static`. This prevents a
structural implementation from being mistaken for a protocol-compatible
Noise transcript.
