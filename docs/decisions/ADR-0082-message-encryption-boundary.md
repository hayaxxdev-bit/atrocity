# ADR-0082 — Signal Ciphertext Is Separate From the WhatsApp Envelope

Signal encryption returns ciphertext plus a message type.

The WhatsApp adapter wraps that result into the target `to`/`enc` protocol
node. This prevents Signal internals from leaking into transport/domain
message construction.
