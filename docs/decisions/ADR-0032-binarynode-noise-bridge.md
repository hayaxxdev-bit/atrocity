# ADR-0032 — BinaryNode/Noise Bridge

The normal protocol stream begins only after Noise transport is installed.

Handshake traffic and post-handshake BinaryNode traffic use the same raw
transport but have different consumers. The bridge therefore switches from
handshake ownership to node-stream ownership only at the explicit
`encrypted` state.
