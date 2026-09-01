# ADR-0073 — PreKey Wire Serialization

Only public pre-key material crosses the WhatsApp protocol boundary. The serializer follows the current reference three-byte big-endian key-id representation and explicit `skey`/`key` node shapes.
