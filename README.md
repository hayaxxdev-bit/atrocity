# Atrocity

**Independent TypeScript WhatsApp Client Engine** by `hayaxxdev-bit`

---

## 📍 Current Status

**M2.34 — Connection Recovery Composition**  
*Bottom-up implementation aligned with the frozen architecture specification.*

> **Reference:** Baileys serves as a behavioral and protocol reference — **not** a runtime dependency. All implementation is original and independent.

---

## 🎯 Milestone Overview

### M2.31 — Recovery State Machine
Connection recovery is modeled as an **explicit state machine** with a dedicated coordinator. The following boundaries remain **injected and decoupled**:
- Transport layer
- Reauthentication flow
- Resynchronization logic
- Pending message resume

### M2.32 — Reconnect Policy
Reconnect timing is **isolated** behind three clear boundaries:
- **Policy** — defines backoff strategy
- **Scheduler** — orchestrates retry timing
- **Executor** — performs the actual reconnection

Lifecycle recovery remains **independent** from backoff strategy, ensuring separation of concerns.

### M2.33 — Connection Failure Classification
Connection failures are **normalized and classified** before recovery orchestration begins:

| Classification | Action |
|----------------|--------|
| 🔄 Reconnect | Retry connection with backoff |
| 🔐 Reauthenticate | Re-establish credentials |
| 🔧 Session Repair | Fix corrupted session state |
| 🛑 Terminal | Irrecoverable — abort |

### M2.34 — Recovery Composition
Recovery components are **composed through a dedicated boundary**, ensuring:
- Classification
- Reconnect policy
- Lifecycle recovery
- Session repair

...remain **independently owned, testable, and replaceable**.

---

## 🏗️ Architecture Principles

- **Bottom-up implementation** — foundation first, features later
- **Clean boundaries** — every component has explicit contracts
- **Independent ownership** — components are decoupled and replaceable
- **Test-driven** — each milestone includes comprehensive test coverage
- **Reference, not dependency** — Baileys informs, never dictates

---

## 📦 Project Structure

```
atrocity/
├── packages/
│   └── atrocity/          # Core engine
│       ├── src/
│       │   ├── connection/recovery/   # M2.31–M2.34
│       │   ├── noise/                 # Noise protocol
│       │   ├── signal/                # Signal protocol
│       │   └── protocol/              # WhatsApp protocol
│       └── test/                      # Comprehensive test suite
├── docs/
│   ├── decisions/         # ADRs (Architecture Decision Records)
│   ├── reports/           # Audit reports
│   └── specs/             # Feature specifications
├── patches/               # Git patch series (M2.31–M2.34)
└── tooling/               # Build & development tools
```

---

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check
```

---

## 📚 Documentation

- **Architecture Decision Records (ADRs):** [`docs/decisions/`](docs/decisions/)
- **Feature Specifications:** [`docs/specs/`](docs/specs/)
- **Audit Reports:** [`docs/reports/`](docs/reports/)

---

## 🔗 References

- [Baileys](https://github.com/WhiskeySockets/Baileys) — Protocol reference (research only)
- [Noise Protocol Framework](https://noiseprotocol.org/) — Secure handshake
- [Signal Protocol](https://signal.org/docs/) — End-to-end encryption

---

## 📄 License

See [LICENSE](LICENSE) for details.

---

## 👤 Author

**hayaxxdev-bit**

---

> *"Built from the ground up. Reference-informed. Independently engineered."*