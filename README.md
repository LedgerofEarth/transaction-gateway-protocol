# Transaction Gateway Protocol (TGP)

**Version:** 3.4  
**Status:** Public Specification  
**License:** Apache 2.0

---

## What is TGP?

Transaction Gateway Protocol (TGP) is an **economic routing and settlement coordination protocol** for blockchain transactions. It enables buyers, merchants, and settlement providers to coordinate safe, non-custodial transactions across trust boundaries without requiring direct relationships or shared custody of funds.

TGP defines how parties express transaction intent, verify authenticity, negotiate terms, and coordinate settlement—while maintaining transaction boundary isolation and split visibility between participants.

---

## What TGP Is NOT

- **Not a wallet** — TGP works with existing wallets
- **Not a blockchain** — TGP is chain-agnostic and operates at the application layer
- **Not a token** — TGP is a messaging protocol, not a cryptocurrency
- **Not custodial** — Funds remain in user control until final settlement
- **Not zero-knowledge by default** — Privacy extensions are strictly optional

---

## Core Design Principles

### Transaction Boundary Isolation
Each party sees only the information necessary for their role in the transaction. Buyers, merchants, and settlement providers operate within isolated transaction boundaries.

### Split Visibility
No single party has complete visibility into all transaction details. Transaction identifiers are not shared across boundaries to prevent correlation.

### Delegated Execution
Gateways coordinate transaction execution without ever controlling user keys or funds. Settlement is enforced by on-chain contracts, not trusted intermediaries.

### Non-Custodial by Default
TGP is designed to minimize custody risk. Gateways verify and route transactions but cannot unilaterally move funds.

---

## Protocol Versions

### TGP-00 v3.4 (Base Protocol)

The base specification defines:
- Message types (QUERY, ACK, SETTLE, WITHDRAW)
- State transitions and validation rules
- Settlement coordination semantics
- WebSocket transport layer
- Signature schemes and replay protection

**All implementations MUST support the base protocol.**

### TGP-00 v3.4-ZK (Optional Extension)

An optional extension that adds zero-knowledge proof verification for enhanced privacy:
- `buyer_commitment` field (Poseidon hash commitment)
- `zk_proof` field (Groth16 proof structure)
- On-chain verification semantics

**Zero-knowledge functionality is strictly optional.** Base protocol implementations are fully compliant without ZK support. ZK fields are invalid in base protocol messages unless the extension is explicitly declared.

---

## Repository Structure

```
/specs
  ├── TGP-00-v3.4-README.md      # Overview and navigation
  ├── TGP-00-v3.4-Part1.md       # Core Protocol & Transport
  ├── TGP-00-v3.4-Part2.md       # Economic Messages & Preview Layer
  ├── TGP-00-v3.4-Part3.md       # Implementation & Security
  ├── TGP-00-v3.4-ZK.md          # Zero-knowledge extension (optional)
  ├── TGP-EXT-00.md              # Extension rules & philosophy
  ├── TGP-GLOSSARY.md            # Term definitions
  └── TGP-CHANGELOG.md           # Version history

/diagrams
  └── (protocol flow diagrams)

/examples
  ├── query.json                 # Transaction query example
  ├── settle.json                # Settlement request example
  └── (other message examples)

CONTRIBUTING.md                  # How to contribute
README.md                        # This file
LICENSE                          # Apache 2.0
```

---

## Key Concepts

### Economic Control Plane
TGP operates as a "Layer 8" economic control plane—above traditional network layers but below application business logic. It provides transaction routing, policy evaluation, and settlement coordination without modifying wallet behavior.

### Gateway-Mediated Settlement
Transactions are evaluated by gateways that verify:
- Merchant authenticity and registry membership
- Transaction structure and validity
- Policy compliance (amount limits, jurisdictional rules, etc.)
- Settlement contract state and eligibility

Gateways return executable transaction envelopes that wallets sign and submit.

### Privacy Through Separation
TGP achieves privacy by separating transaction visibility:
- Buyers see merchant identity but not settlement details
- Merchants see payment confirmation but not buyer wallet addresses
- Settlement providers see on-chain state but not buyer-merchant relationship
- No shared transaction identifiers across boundaries

### Optional Zero-Knowledge
For enhanced privacy, buyers can optionally include zero-knowledge proofs that cryptographically prove intent without revealing:
- Wallet addresses
- Transaction amounts
- Nonce values

This extension is backward-compatible and opt-in per transaction.

---

## Getting Started

### Read the Specifications

1. Start with [TGP-00 v3.4](./specs/TGP-00-v3.4-README.md) for the base protocol
2. Review [TGP-GLOSSARY.md](./specs/TGP-GLOSSARY.md) for terminology
3. Check [TGP-00-v3.4-ZK.md](./specs/TGP-00-v3.4-ZK.md) if implementing privacy features
4. See [TGP-EXT-00.md](./specs/TGP-EXT-00.md) for extension design philosophy

### Implement TGP

TGP is designed to be implemented independently by:
- **Wallets and agents** (clients) — Sign messages, manage previews, interact with users
- **Routing and coordination services** (gateways) — Validate messages, generate previews, coordinate settlement
- **Settlement and escrow smart contracts** — Hold funds, enforce rules, execute withdrawals

See [/implementations](./implementations/) for reference designs and code examples.

#### Quick Implementation Guide

1. **For Client Developers:**
   - Read [Client Reference](./implementations/client/README.md)
   - Implement EIP-712 message signing
   - Add preview hash storage
   - Handle WebSocket communication

2. **For Gateway Developers:**
   - Read [Gateway Reference](./implementations/gateway/README.md)
   - Implement signature verification
   - Add preview generation
   - Build routing and validation pipeline

3. **For Contract Developers:**
   - Read [Escrow Reference](./implementations/escrow/README.md)
   - Deploy settlement contracts
   - Add preview binding (recommended)
   - Implement withdrawal logic

### Explore Examples

The `/examples` directory contains annotated JSON message examples showing:
- Basic transaction queries
- Settlement coordination flows
- Optional ZK extension usage

### Join the Community

- **GitHub Discussions:** Protocol design and implementation questions
- **Telegram:** [TGP Contributors Group] (coming soon)
- **Issues:** Bug reports and specification clarifications

---

## Use Cases

### Private Commerce
Merchants can accept blockchain payments without exposing customer wallet addresses or revealing their own settlement infrastructure.

### Cross-Chain Settlement
Coordinate multi-chain transactions with atomic settlement guarantees, enabling buyers and merchants on different networks to transact safely.

### Policy-Aware Routing
Gateways can enforce jurisdiction-specific rules, amount limits, and compliance requirements without requiring changes to wallet software.

### AI Agent Payments
Autonomous agents can use TGP to negotiate and execute payments on behalf of users, with cryptographic guarantees preventing unauthorized spending.

---

## Who Should Use TGP?

### Protocol Implementers
- Wallet developers adding commerce capabilities
- Payment gateway operators
- RPC providers offering value-added services
- Settlement network operators

### Application Builders
- E-commerce platforms requiring blockchain payments
- Autonomous agent platforms
- Cross-border payment services
- Decentralized marketplaces

### Researchers
- Privacy protocol designers
- Economic mechanism designers
- Distributed systems researchers

---

## Technical Overview

### Message Flow

```
1. QUERY     → Buyer expresses transaction intent to gateway
2. ACK       → Gateway returns authorization (offer/allow/deny/revise)
3. SETTLE    → Buyer submits signed transaction for settlement
4. ACK       → Gateway confirms on-chain settlement
```

### State Transitions

Transactions progress through defined states:
- `PENDING` — Initial query received
- `OFFERED` — Gateway provides preview
- `ALLOWED` — Executable envelope provided
- `SETTLING` — Transaction submitted to blockchain
- `SETTLED` — On-chain confirmation received
- `COMPLETE` — Full protocol flow finished

### Verification Layers

Every transaction passes through deterministic verification:
1. **Registry Validation** — Merchant authenticity
2. **Cryptographic Validation** — Signatures and proofs
3. **Contract Integrity** — Bytecode and state verification
4. **Policy Evaluation** — Business rules and limits
5. **Settlement Eligibility** — On-chain state checks

---

## Security Properties

### What TGP Guarantees

- **Non-Custodial Operation:** Gateways cannot seize or move user funds
- **Deterministic Evaluation:** Same inputs always produce same outputs
- **Replay Protection:** Nonces and timestamps prevent replay attacks
- **Signature Verification:** All messages cryptographically authenticated
- **State Binding:** Transactions bind to specific contract states

### What TGP Does NOT Guarantee

- **Anonymity:** Base protocol reveals transaction existence (use ZK extension for privacy)
- **Censorship Resistance:** Gateways can reject transactions per policy
- **Finality:** Settlement depends on underlying blockchain finality
- **Regulatory Compliance:** Implementers must ensure local compliance

---

## Relationship to Other Standards

### x402 Payment Required
TGP can be triggered by HTTP 402 responses or x402 events but operates independently. x402 provides negotiation transport; TGP provides settlement coordination.

### EIP-2612 Permits
TGP settlement often uses EIP-2612 permit signatures for gasless approvals, but the protocol is not dependent on any specific approval mechanism.

### WebSocket Protocol
TGP uses WebSocket for real-time bidirectional communication but could be adapted to other transports (HTTP long-polling, gRPC, etc.).

---

## Contributing

We welcome contributions from the community! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- How to propose specification changes
- PR format requirements
- Discussion guidelines
- What changes require version bumps

**Please Note:** TGP is designed as a neutral, implementation-agnostic protocol. Contributions should focus on protocol clarity, not implementation details or chain-specific optimizations.

---

## License

This specification is licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for full terms.

Code implementations may have different licenses. This repository contains only specification documents.

---

## Governance

TGP is maintained as an open protocol with community governance:
- Specification changes follow public review process
- Breaking changes require major version increments
- Backward compatibility is prioritized
- Multiple implementations encouraged

---

## Acknowledgments

TGP builds on research and development in:
- Trust-minimized exchange protocols
- Zero-knowledge proof systems
- Blockchain settlement mechanisms
- Economic protocol design

The protocol is designed to be implementation-agnostic and vendor-neutral.

---

## Contact

- **GitHub Issues:** Technical questions and bug reports
- **GitHub Discussions:** Design discussions and proposals
- **Email:** [To be determined]

---

*Transaction Gateway Protocol is an open standard for blockchain commerce coordination. It enables private, non-custodial transactions across trust boundaries.*
