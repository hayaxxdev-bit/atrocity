# ADR-0055 — Explicit Composition Root

Production object graphs are assembled in one composition root.

Internal modules should not construct unrelated infrastructure as hidden
side-effects. This makes ownership, lifetime, and test substitution explicit.
