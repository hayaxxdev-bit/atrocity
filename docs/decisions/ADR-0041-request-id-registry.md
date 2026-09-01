# ADR-0041 — Central Request IDs and Protocol Dispatch

IQ request ids are generated centrally so feature code does not need to invent
protocol identifiers.

Inbound protocol routing is centralized in ProtocolRegistry, preventing a
proliferation of independent `if/else` dispatch chains across feature modules.
