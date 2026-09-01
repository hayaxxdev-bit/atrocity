# ADR-0046 — Delivery State Separate From Sending

Message construction/sending and delivery state are separate concerns.

MessageApi creates and sends protocol nodes. MessageDeliveryTracker records
the state observed from transport acknowledgements and receipts.

This keeps retries, receipts, and delivery policy out of the basic message
builder.
