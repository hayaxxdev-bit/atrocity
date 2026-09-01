# ADR-0048 — Presence Feature Boundary

Presence is an independent protocol feature.

Inbound presence is normalized into an event. Outbound presence is constructed
by a dedicated builder/API.

Message, receipt, and presence semantics must not share one monolithic feature
state machine.
