# ADR-0039 — Centralized IQ Correlation

IQ request/response matching is centralized in `IqCorrelator`.

Feature services should not maintain independent `Map<id, Promise>` registries.
Timeout, abort, remote-error, transport-failure, and connection-close behavior
therefore remain consistent across all IQ-based features.
