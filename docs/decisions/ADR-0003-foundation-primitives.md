# ADR-0003 — Foundation Error and Result Primitives

## Decision

Atrocity introduces a small foundation layer for stable error codes, typed errors, and explicit result values before protocol/runtime implementation.

## Constraints

- No transport-specific errors here.
- No Baileys types here.
- No implicit global error handling.
- Errors may carry a causal chain and sanitized details.
- `Result<T, E>` is explicit and does not throw by itself.

## Rationale

These primitives provide a shared contract for later protocol, crypto, authentication, sync, and messaging layers without coupling them to any infrastructure implementation.
