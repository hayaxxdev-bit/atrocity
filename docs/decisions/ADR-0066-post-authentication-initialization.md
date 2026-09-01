# ADR-0066 — Authentication Success Is Not Runtime Ready

Server acceptance and runtime readiness are different states.

The post-auth initializer performs required session initialization before the
connection may be considered fully authenticated/ready.

This prevents callers from observing a successful login while local/server
key material or initialization steps are still incomplete.
