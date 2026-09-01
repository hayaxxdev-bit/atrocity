# ADR-0014 — Versioned ClientPayload Adapter

ClientPayload is implemented as a target-specific protobuf adapter and typed
domain object. The generic protobuf primitives remain independent.

The adapter accepts unknown fields on decode for forward compatibility but
does not silently invent missing mandatory fields.

The complete authentication/registration credential model remains a separate
milestone.
