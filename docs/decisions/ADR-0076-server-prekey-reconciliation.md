# ADR-0076 — PreKey Reconciliation Is a Decision Layer

Server observations are converted into an explicit local decision before
network upload occurs.

The reconciler never sends data. It produces an auditable plan that can be
materialized into local pending-upload state and then executed by the
WhatsApp exchange adapter.
