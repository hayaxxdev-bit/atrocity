# ADR-0034 — Canonical Connection Lifecycle Events

ConnectionManager is the sole lifecycle owner. It emits immutable events to a
separate event bus.

Consumers such as metrics, dashboards, and logs subscribe to this stream but
cannot control lifecycle through it.

Event ordering is serialized to preserve causality even when listeners are
asynchronous.
