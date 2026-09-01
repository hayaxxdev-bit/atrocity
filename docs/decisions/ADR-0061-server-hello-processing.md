# ADR-0061 — Explicit ServerHello Processing Sequence

ServerHello processing is modeled as a target-specific sequence around generic
crypto and certificate primitives.

The implementation records the exact reference operation order without
embedding fabricated expected cryptographic outputs.
