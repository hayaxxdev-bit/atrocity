# ADR-0060 — ClientHello as Target Adapter

The WhatsApp ClientHello shape is represented in a dedicated target adapter.

Key material generation and protobuf serialization remain external
dependencies.

This prevents the handshake adapter from silently embedding a non-reference
wire codec.
