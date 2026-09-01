# ADR-0021 — Layer Double Ratchet State

The Double Ratchet is split into:
1. root-key state,
2. sending/receiving chain state,
3. DH-ratchet transitions,
4. skipped-message state,
5. message serialization.

M1.25 implements only the first two layers. This prevents out-of-order and
DH-transition behavior from being mixed into basic KDF progression.
