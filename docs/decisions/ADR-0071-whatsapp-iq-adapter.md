# ADR-0071 — WhatsApp IQ Operations as Target Adapters

Generic IQ correlation remains infrastructure.

WhatsApp-specific IQ namespaces, target tags, and payload structures are
implemented as small target adapters so the generic request/response system
does not accumulate WhatsApp-specific branches.
