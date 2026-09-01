# ADR-032 — Separate Reconnect Policy from Recovery Lifecycle

## Status

Accepted

## Context

A connection lifecycle needs retry behavior, but retry timing is a policy concern rather than a state-machine concern.

Putting exponential backoff, jitter, timers, and attempt limits inside `ConnectionRecoveryCoordinator` would make lifecycle tests timing-sensitive and couple recovery semantics to operational policy.

## Decision

Introduce three boundaries:

- `ReconnectPolicy` — computes delay and exhaustion
- `ReconnectScheduler` — owns waiting/time
- `ReconnectExecutor` — performs the retry loop around transport connect

M2.31 remains unaware of the selected strategy.

## Consequences

### Positive

- deterministic policy tests with zero real waiting
- production can choose exponential backoff while tests can use constant zero-delay scheduling
- operations can change retry limits without changing lifecycle transitions
- transport connection remains replaceable

### Trade-off

A future composition layer must explicitly connect the executor to the recovery coordinator.

## Rejected

### Backoff inside state machine

Rejected because states should model lifecycle, not timing policy.

### `setTimeout` inside reconnect executor

Rejected because it makes tests unnecessarily slow and hides the time boundary.

### Infinite retries

Rejected because a disconnected client must have an observable terminal failure condition.
