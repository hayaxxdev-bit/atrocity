# ADR-033 — Normalize and Classify Connection Failures

## Status

Accepted

## Context

Transport libraries and protocol layers expose heterogeneous errors. Passing those raw errors into recovery logic couples lifecycle semantics to dependency-specific error codes.

## Decision

Introduce:

1. `ConnectionCloseNormalizer`
2. `ConnectionCloseClassifier`
3. `ConnectionRecoveryRouter`

The normalizer produces a stable failure signal. The classifier maps that signal to exactly one recovery action. The router invokes an injected action boundary.

## Consequences

### Positive

- external error representations remain outside the lifecycle
- unit tests can cover recovery decisions without a live socket
- new transport adapters can map their errors into one internal model
- terminal failures become explicit instead of accidentally retried

### Trade-offs

- mappings need maintenance as adapters expose new failure modes
- the abstraction intentionally does not preserve every upstream error code

## Rejected

### Passing raw errors through the whole stack

Rejected because recovery would become coupled to transport implementation details.

### Retrying every failure

Rejected because authentication, protocol, and session failures have different recovery semantics.

### Classifier performing recovery itself

Rejected because classification should remain pure and independently testable.
