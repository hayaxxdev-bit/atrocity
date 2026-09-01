# ADR-0022 — DH Ratchet as a Separate State Machine

The DH ratchet is a distinct state machine above root/chain KDFs.

It owns:
- DHs/DHr
- PN
- Ns/Nr reset rules
- root-chain transitions
- replacement of the local ratchet key

It does not own:
- message serialization
- skipped-message maps
- application payloads

This separation matches the Double Ratchet specification and keeps later
out-of-order handling from being embedded in basic DH transitions.
