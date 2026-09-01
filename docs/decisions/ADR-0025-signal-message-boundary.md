# ADR-0025 — Signal Message Boundary

Signal message processing is split into:
1. ratchet header state,
2. header serialization,
3. message-key retrieval,
4. associated-data construction,
5. AEAD.

No transport framing is embedded in the message cryptography layer.

The current header format is internal and intentionally not presented as
WhatsApp wire compatibility.
