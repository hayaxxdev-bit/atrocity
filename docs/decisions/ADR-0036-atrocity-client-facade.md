# ADR-0036 — Thin Public Client Facade

`AtrocityClient` is the public API facade. It intentionally exposes only
stable operations and derived snapshots.

Internal subsystem classes remain available to infrastructure/testing layers
but are not required for normal application use.

The facade does not become a second lifecycle owner; ConnectionManager and
its event stream remain authoritative.
