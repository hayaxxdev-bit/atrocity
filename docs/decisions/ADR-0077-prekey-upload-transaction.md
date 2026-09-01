# ADR-0077 — PreKey Upload Is Transactional

A pre-key is marked uploaded only after the corresponding IQ operation
resolves successfully.

Network failure preserves pending-upload state.
