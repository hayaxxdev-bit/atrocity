# ADR-031 — Keep Connection Recovery as an Orchestration Boundary

## Status

Accepted

## Context

Connection loss crosses several subsystems: transport, authentication, authenticated session state, stream runtime, Signal synchronization, and pending message delivery.

Placing all recovery logic into the connection manager would make the manager responsible for unrelated protocols and create a god object.

## Decision

Introduce a dedicated `ConnectionRecoveryStateMachine` plus `ConnectionRecoveryCoordinator`.

The state machine is pure lifecycle control. The coordinator sequences injected operations. Existing protocol implementations remain owners of their own state and side effects.

## Consequences

### Positive

- recovery transitions are testable without sockets
- session-invalid recovery is explicit
- normal reconnects avoid unnecessary reauthentication
- resync and message resume stay independently replaceable
- failures have typed lifecycle outcomes

### Trade-offs

- recovery requires dependency injection
- upstream connection lifecycle code must map concrete errors into recovery reasons
- retry/backoff remains outside M2.31

## Rejected

### One monolithic ConnectionManager

Rejected because it would mix transport, auth, stream, session, repair, and message responsibilities.

### Always start from scratch

Rejected because reconnecting a live authenticated session should not automatically discard usable session state.

### Implicit retry loops

Rejected because hidden retries make failure semantics difficult to observe and test.
