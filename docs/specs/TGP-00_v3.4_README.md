# TGP-00 v3.4 — Transaction Gateway Protocol

**A CoreProve Protocol Specification**

- **Version:** 3.4
- **Status:** Draft for Review
- **Date:** 2025-12-13
- **Replaces:** TGP-00 v3.3 and TxIP-00

---

## Document Structure

This specification is organized into three parts for easier handling:

### **Part 1: Core Protocol & Transport**
- Abstract & Introduction
- Protocol Overview
- Message Categories
- WebSocket Transport
- Authentication Model
- General Message Structure
- Canonical Hashing & Signatures
- Replay Protection
- Transport Messages (PING, PONG, PREVIEW, VALIDATE)

### **Part 2: Economic Messages & Preview Layer**
- Economic Message Specifications (QUERY, ACK, SETTLE, WITHDRAW)
- Preview Layer Architecture (NEW in v3.4)
- Message Schema Extensions
- Routing Rules
- Agent Messages
- Complete Message Examples

### **Part 3: Implementation Guide & Security**
- Message Size Constraints
- Security Considerations
- Migration Path (v3.3 → v3.4)
- Error Code Catalog
- Implementation Checklist
- Glossary
- Appendices

---

## Quick Navigation

- [Part 1: Core Protocol](./TGP-00_v3.4_Part1_Core_Protocol.md)
- [Part 2: Messages & Preview Layer](./TGP-00_v3.4_Part2_Messages.md)
- [Part 3: Implementation & Security](./TGP-00_v3.4_Part3_Implementation.md)

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

1. Read [Part 1](./TGP-00_v3.4_Part1_Core_Protocol.md) for protocol fundamentals
2. Review [Part 2](./TGP-00_v3.4_Part2_Messages.md) for message specifications
3. Consult [Part 3](./TGP-00_v3.4_Part3_Implementation.md) for implementation guidance

For questions or feedback, contact the CoreProve team.
