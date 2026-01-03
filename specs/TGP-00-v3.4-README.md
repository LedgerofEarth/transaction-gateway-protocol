# TGP-00 v3.4 — Transaction Gateway Protocol

**An Open Protocol for Trust-Minimized Blockchain Commerce**

- **Version:** 3.4
- **Status:** Public Specification
- **Date:** 2025-01-02
- **Replaces:** TGP-00 v3.3 and TxIP-00
- **License:** Apache 2.0

---

## Overview

This document defines the base Transaction Gateway Protocol (TGP) version 3.4.

**Zero-knowledge functionality is defined in TGP-00-v3.4-ZK and is strictly optional.**

TGP-00 v3.4 is an open-source protocol specification for trust-minimized, privacy-preserving blockchain commerce and settlement coordination. It defines the unified message transport, authentication, canonical hashing, signature verification, replay protection, preview layer, routing semantics, and coordination model for decentralized settlement ecosystems.

---

## Document Structure

This specification is organized into three parts for easier handling:

### Part 1: Core Protocol & Transport
- Abstract & Introduction
- Protocol Overview
- Message Categories
- WebSocket Transport
- Authentication Model
- General Message Structure
- Canonical Hashing & Signatures
- Replay Protection
- Transport Messages (PING, PONG, PREVIEW, VALIDATE)

**[Read Part 1: Core Protocol →](./TGP-00-v3.4-Part1.md)**

### Part 2: Economic Messages & Preview Layer
- Economic Message Specifications (QUERY, ACK, SETTLE, WITHDRAW)
- **Preview Layer Architecture (NEW in v3.4)**
- Message Schema Extensions
- Routing Rules
- Agent Messages
- Complete Message Examples

**[Read Part 2: Messages →](./TGP-00-v3.4-Part2.md)**

### Part 3: Implementation Guide & Security
- Message Size Constraints
- Security Considerations
- Migration Path (v3.3 → v3.4)
- Error Code Catalog
- Implementation Checklist
- Glossary
- Appendices

**[Read Part 3: Implementation →](./TGP-00-v3.4-Part3.md)**

---

## Key Changes in v3.4

### Preview Layer (NEW)
- Cryptographically committed transaction previews
- Gas mode determination (RELAY vs WALLET)
- Settlement contract binding
- Preview hash verification in SETTLE
- Single-use preview consumption

### Enhanced Messages
- QUERY: Added `force_wallet`, optional `settlement_contract`
- ACK: Added `preview_hash`, `gas_mode`, `settlement_contract`
- SETTLE: Added `preview_hash` (REQUIRED)

### Protocol Improvements
- Clearer error semantics with retry guidance
- Enhanced transport error handling
- Improved UX hints (gas mode signaling)
- Better separation of canonical vs advisory data

---

## Implementation Status

- ✅ Core Protocol: Stable
- ✅ Transport Layer: Stable
- ✅ Preview Layer: NEW in v3.4
- ✅ Economic Messages: Updated for preview support
- 🔄 Migration: Backward compatible with v3.3

---

## Getting Started

1. Read [Part 1](./TGP-00-v3.4-Part1.md) for protocol fundamentals
2. Review [Part 2](./TGP-00-v3.4-Part2.md) for message specifications
3. Consult [Part 3](./TGP-00-v3.4-Part3.md) for implementation guidance

---

## Extension Support

This specification defines the base protocol only. Zero-knowledge functionality is provided as a strictly optional extension:

- **TGP-00 v3.4 (Base)** — This specification (REQUIRED)
- **TGP-00 v3.4-ZK (Extension)** — Optional zero-knowledge proof support

All ZK fields are invalid in base protocol messages unless the extension is explicitly declared per transaction.

See [TGP-00-v3.4-ZK.md](./TGP-00-v3.4-ZK.md) for zero-knowledge extension specification.

---

## Protocol Philosophy

TGP is designed as an open standard that any implementation can adopt. The protocol prioritizes:

- **Interoperability** — Any compliant client can communicate with any compliant gateway
- **Transparency** — All protocol rules are publicly documented
- **Decentralization** — No central authority controls the protocol
- **Privacy** — Built-in privacy preservation for commercial transactions
- **Extensibility** — Support for future settlement types and automation

---

## What TGP Guarantees

- **Non-Custodial Operation** — Gateways cannot seize or move user funds
- **Deterministic Evaluation** — Same inputs always produce same outputs
- **Replay Protection** — Nonces and timestamps prevent replay attacks
- **Signature Verification** — All messages cryptographically authenticated
- **State Binding** — Transactions bind to specific contract states
- **Transaction Boundary Isolation** — Each party sees only necessary information
- **Split Visibility** — No single party has complete transaction visibility

---

## What TGP Does NOT Guarantee

- **Anonymity** — Base protocol reveals transaction existence (use ZK extension for privacy)
- **Censorship Resistance** — Gateways can reject transactions per policy
- **Finality** — Settlement depends on underlying blockchain finality
- **Regulatory Compliance** — Implementers must ensure local compliance

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to propose changes to this specification.

---

## License

This specification is licensed under Apache License 2.0. See [LICENSE](../LICENSE) for full terms.

