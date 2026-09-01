# ADR-0015 — Credential Boundary

Authentication credentials are a first-class durable domain. Key generation,
credential lifecycle, and registration-bundle shaping are separated from the
transport and Noise layers.

The current signed-pre-key signature is explicitly non-production until the
crypto provider exposes the required signing primitive and the exact Signal
construction is verified.
