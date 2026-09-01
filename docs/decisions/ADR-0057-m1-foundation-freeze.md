# ADR-0057 — M1 Foundation Freeze

M1 is frozen after architectural audit.

The package root is a stable public API. Internal infrastructure is no longer
implicitly public.

Future target-specific changes should live in M2 adapters whenever possible.
A foundation change requires evidence that an M1 boundary is structurally
incorrect, not merely that a new WhatsApp feature needs a new implementation.
