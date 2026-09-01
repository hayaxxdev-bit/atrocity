# ADR-0040 — IQ Service Layer

Feature services should build on one `IqService` rather than talking directly
to the correlator or constructing raw IQ nodes independently.

This keeps request construction, correlation, timeout, and response validation
consistent across the protocol feature layer.
