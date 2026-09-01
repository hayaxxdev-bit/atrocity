# ADR-0087 — Persist Ratchet State Before Publishing Decrypted Messages

Successful Signal decryption mutates session/ratchet state.

That state is committed before the decrypted WAMessage is published to the
application event layer, preventing crash-window replay/state divergence.
