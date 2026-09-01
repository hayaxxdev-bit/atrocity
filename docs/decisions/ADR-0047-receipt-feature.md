# ADR-0047 — Receipt-to-Delivery Translation

Receipts are protocol observations. MessageDeliveryTracker is the domain
state machine.

ReceiptFeature performs the translation between them, keeping protocol shape
out of the delivery tracker.
