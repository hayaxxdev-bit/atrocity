# ADR-0081 — Active Session Requires Persistent Commit

Authentication success is not enough to publish an active runtime session.

Credentials, post-auth readiness, and Signal key-bundle state must pass a
single persistence boundary first.
