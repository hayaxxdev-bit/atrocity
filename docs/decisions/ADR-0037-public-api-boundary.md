# ADR-0037 — Stable Public API and Versioned Capabilities

`AtrocityClient` is the supported application-facing facade.

Capabilities are explicit, versioned descriptors. Unsupported features are
represented as unavailable/experimental rather than being inferred from
internal classes.

The public facade remains thin and delegates lifecycle ownership to
ConnectionManager.
