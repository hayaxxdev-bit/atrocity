# ADR-0078 — Signed PreKey Rotation Is Commit-After-Ack

A new signed pre-key remains non-active until the server accepts the rotation
operation. Remote failure preserves the prior active key.
