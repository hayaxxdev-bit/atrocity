# ADR-0049 — Canonical Protocol Domain Event Bus

Protocol features publish domain events through one typed event bus.

The bus is observational and asynchronous. It does not control connection or
feature lifecycle and does not persist events.

Per-event queues preserve ordering while allowing unrelated event names to
progress independently.
