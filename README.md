# Atrocity

Independent TypeScript WhatsApp client engine by `hayaxxdev-bit`.

## Current milestone

**M1.2 — Error & Result Primitives**

The project is being implemented bottom-up from the frozen architecture specification.

Baileys is a reference source for protocol/behavior research, not a runtime dependency.

## M2.31

Connection recovery is modeled as an explicit state machine and coordinator. Transport, reauthentication, resync, and pending-message resume remain injected boundaries.

## M2.32

Reconnect timing is isolated behind policy, scheduler, and executor boundaries. Lifecycle recovery remains independent from backoff strategy.

## M2.33

Connection failures are normalized and classified into reconnect, reauthenticate, session repair, or terminal actions before recovery orchestration.

## M2.34

Recovery components are composed through a dedicated boundary so classification, reconnect policy, lifecycle recovery, and repair remain independently owned.
