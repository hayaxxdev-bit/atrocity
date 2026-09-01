# ADR-0086 — Retry Never Reuses Ciphertext

Retry always starts from plaintext and current Signal session state. Session
repair, when required, precedes re-encryption. Old ciphertext is never the
retry input.
