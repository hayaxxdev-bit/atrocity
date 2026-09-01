# ADR-0070 — Canonical Inbound Node Dispatch

Inbound decoded nodes enter exactly one canonical dispatch bridge.

IQ correlation occurs first, followed by the protocol event bus, then feature
routing.

This ordering allows request/response futures to resolve promptly while still
letting feature handlers observe the same node.
