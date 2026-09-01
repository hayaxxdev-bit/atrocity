# ADR-0027 — Versioned Atomic Session Persistence

Signal session state is persisted through a versioned binary record. Writes use
temp-file + rename semantics to avoid partial records.

A checksum is used only for corruption detection. Encryption/authentication at
rest remains a separate storage security layer.
