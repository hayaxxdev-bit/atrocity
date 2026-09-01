# ADR-034 — Compose Recovery Without a God Object

## Status

Accepted

## Context

The preceding milestones introduced independent recovery boundaries:

- lifecycle state machine
- reconnect policy/executor
- close/error classification

Those components need a composition point, but merging them into `ConnectionManager` would recreate the architectural coupling they were introduced to avoid.

## Decision

Introduce `ConnectionRecoveryComposer` as a thin composition boundary and a semantic-free wiring adapter.

The composer:

1. classifies one signal
2. dispatches exactly one action
3. returns an explicit result
4. rejects concurrent composition

The adapter factory only forwards explicitly supplied handlers. It does not impose a reconnect/reauth/repair order.

## Consequences

### Positive

- wiring becomes explicit
- each subsystem remains independently testable
- composition tests do not require a live socket
- future production adapters can choose concrete sequencing without altering the core classifier

### Trade-offs

- integration requires explicit dependency wiring
- callers must own domain-specific sequencing

## Rejected

### Put classification into reconnect executor

Rejected because reconnect timing should not decide semantic recovery action.

### Put all composition into ConnectionRecoveryCoordinator

Rejected because M2.31 coordinator should own lifecycle sequence, not external error taxonomy.

### Create a single `ConnectionManager` recovery method

Rejected because it would accumulate transport, lifecycle, authentication, repair, and terminal semantics.
