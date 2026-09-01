# ADR-0084 — Generated WAProto Codec Is an Injected Boundary

WAMessage protobuf serialization is target protocol infrastructure.

The outbound pipeline depends on an explicit codec interface. No guessed
protobuf encoding is promoted to the compatibility contract.
