
# ADR-0064 — Login and Registration Payload Profiles

Login and registration are separate ClientPayload profiles sharing a common
base.

Validation is performed before encoding so invalid credentials or pairing
material cannot silently become protocol bytes.
