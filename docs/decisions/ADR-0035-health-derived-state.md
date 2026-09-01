# ADR-0035 — Health Is Derived State

Connection health is calculated from canonical lifecycle events and is never
used as an independent source of truth for connection ownership.

Diagnostics may recommend action in a future policy layer, but health itself
cannot reconnect, disconnect, or mutate protocol state.
