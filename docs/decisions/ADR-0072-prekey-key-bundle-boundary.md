# ADR-0072 — Signal Key Bundle vs WhatsApp Exchange

Signal key material remains a protocol-independent domain object.

The WhatsApp adapter converts that domain object into target-specific IQ
nodes. Exact serialization is injected so private key material cannot leak
into a generic transport or node builder accidentally.
