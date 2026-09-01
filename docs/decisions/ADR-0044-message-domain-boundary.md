# ADR-0044 — Message Domain Boundary

Message processing is separated into raw protocol node, normalization, and
domain event.

MessageFeature owns route lifecycle and event publication. MessageNormalizer
owns only node-to-domain mapping.

Future WAProto changes should remain localized to protocol feature adapters.
