# ADR-0028 — Aggregate Auth/Session Store

Authentication credentials and Signal sessions are exposed through a single
domain store while retaining separate persistence records.

All mutations are serialized in-process and committed using atomic replacement.
This gives the protocol layer a single lifecycle boundary without coupling it
to a particular database.

Encryption at rest remains an explicit infrastructure concern.
