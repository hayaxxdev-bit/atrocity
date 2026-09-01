# ADR-0080 — Repair Requires Post-Repair Verification

Key-bundle repair is an orchestrated transaction across specialized
components.

The final state is `repaired` only after a fresh server digest check matches.
