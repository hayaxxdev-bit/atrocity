# @hayaxxdev-bit/atrocity

Early implementation scaffold for Atrocity.

## M1.2

This milestone adds the first stable foundation primitives:

- `AtrocityError` and machine-readable `ErrorCode`
- common public error classes
- `Result<T, E>` and `AsyncResult<T, E>`
- nominal identifiers for future runtime/session/connection boundaries

These primitives intentionally avoid transport, protocol, crypto, or Baileys-specific concepts.
