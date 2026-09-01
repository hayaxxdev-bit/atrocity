# ADR-0052 — Capability Negotiation Before Feature Activation

Server discovery and feature requirements are combined in a dedicated
negotiation step.

Negotiation produces decisions; feature lifecycle consumes decisions.

This prevents features from independently guessing whether the current server
profile supports them.
