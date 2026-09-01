# ADR-0038 — WABinary Syntax vs Semantics

BinaryNode/WABinary serialization and protocol semantics are separate layers.

WABinary codec:
- bytes ↔ ProtocolNode

Semantic layer:
- meaning of tags
- attribute expectations
- child/path matching
- validation

This prevents protocol business logic from leaking into the binary codec.
