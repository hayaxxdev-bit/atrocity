# ADR-0067 — WABinary Codec Is Profile-Driven

WABinary control-flow semantics belong to the codec; vocabulary belongs to the
profile.

Double-byte token dictionaries and JID encodings are part of the codec
contract, while the evolving token vocabulary is supplied as data.

This allows the reference vocabulary to change without rewriting the framing
logic.
