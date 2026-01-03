# TGP Reference Implementations

This directory contains **reference implementations** demonstrating how to build TGP-compliant components. These are illustrative examples, not production code.

---

## Overview

The Transaction Gateway Protocol (TGP) is designed to be implemented independently by different parties. Any compliant implementation may replace these examples.

### Three Core Components

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │ ◄─────► │   Gateway   │ ◄─────► │   Escrow    │
│  (Wallet)   │         │  (Router)   │         │  (Contract) │
└─────────────┘         └─────────────┘         └─────────────┘
```

---

## 1. TGP Client

**What it is:**
A client implementation (wallet, browser extension, or agent) that:
- Signs economic messages (QUERY, SETTLE, WITHDRAW)
- Stores preview hashes
- Manages nonces and replay protection
- Presents transaction details to users

**What it does:**
- Connects to gateways via WebSocket
- Sends QUERY messages to express transaction intent
- Receives ACK messages with preview commitments
- Signs and sends SETTLE messages for execution
- Handles errors and retries

**See:** [`client/`](./client/)

---

## 2. TGP Gateway

**What it is:**
A gateway implementation (routing service) that:
- Validates message signatures
- Generates transaction previews
- Enforces replay protection
- Coordinates settlement execution
- Never holds user private keys

**What it does:**
- Receives and validates economic messages
- Generates cryptographically committed previews
- Verifies preview hashes on settlement
- Routes validated transactions to settlement executors
- Returns ACK/ERROR responses

**See:** [`gateway/`](./gateway/)

---

## 3. TGP Escrow Contract

**What it is:**
An on-chain smart contract that:
- Holds escrowed funds
- Enforces settlement rules
- Validates preview commitments
- Executes withdrawals
- Provides on-chain verification

**What it does:**
- Accepts funded settlements from buyers
- Validates preview hashes (if preview-bound)
- Enforces timelocks and conditions
- Releases funds to sellers on withdrawal
- Emits settlement events

**See:** [`escrow/`](./escrow/)

---

## Component Interaction

### Basic Flow

```
1. Client → Gateway: QUERY (signed)
2. Gateway: Generates preview, stores preview_hash
3. Gateway → Client: ACK with preview_hash
4. Client: User reviews preview, signs SETTLE
5. Client → Gateway: SETTLE (signed, includes preview_hash)
6. Gateway: Verifies preview_hash, routes to executor
7. Executor → Escrow: Settlement transaction
8. Escrow: Validates and accepts settlement
9. Gateway → Client: ACK (settlement confirmed)
10. Seller → Gateway: WITHDRAW (after conditions met)
11. Gateway → Escrow: Withdrawal execution
12. Escrow: Releases funds to seller
```

---

## Design Principles

### Client Responsibilities
- ✅ Sign all economic messages
- ✅ Store preview hashes securely
- ✅ Display preview details to users
- ✅ Manage nonces per address
- ❌ Never send unsigned economic messages
- ❌ Never bypass preview verification

### Gateway Responsibilities
- ✅ Verify all signatures
- ✅ Generate and store previews
- ✅ Enforce replay protection
- ✅ Validate preview hashes on SETTLE
- ❌ Never hold user private keys
- ❌ Never modify transaction parameters

### Escrow Responsibilities
- ✅ Enforce settlement rules on-chain
- ✅ Validate preview bindings (if applicable)
- ✅ Hold funds securely until conditions met
- ✅ Execute deterministic withdrawals
- ❌ Never allow premature release
- ❌ Never bypass verification steps

---

## Implementation Guidelines

### For Client Implementers

1. **Read the spec:** [TGP-00 v3.4](../specs/TGP-00-v3.4-README.md)
2. **Study examples:** [`client/`](./client/)
3. **Implement signature logic:** EIP-712 canonical signing
4. **Add replay protection:** Nonce, timestamp, UUID
5. **Store preview hashes:** Persist between QUERY and SETTLE
6. **Handle errors:** Graceful error handling and retries

### For Gateway Implementers

1. **Read the spec:** [TGP-00 v3.4](../specs/TGP-00-v3.4-README.md)
2. **Study flows:** [`gateway/`](./gateway/)
3. **Implement verification:** Signature recovery and validation
4. **Add preview layer:** Generate, store, and verify previews
5. **Enforce security:** Replay protection, nonce tracking, timestamp windows
6. **Route carefully:** Never modify validated messages

### For Contract Implementers

1. **Read the spec:** [TGP-00 v3.4 Part 2](../specs/TGP-00-v3.4-Part2.md)
2. **Study examples:** [`escrow/`](./escrow/)
3. **Implement validation:** On-chain verification of settlement conditions
4. **Add preview binding:** Optional but recommended for security
5. **Test thoroughly:** Settlement, withdrawal, error cases
6. **Emit events:** Settlement, withdrawal, error events

---

## Language and Framework Agnostic

These reference implementations are intentionally minimal and focus on protocol compliance, not specific languages or frameworks.

**TGP can be implemented in:**
- **Clients:** TypeScript, Rust, Python, Go, etc.
- **Gateways:** Rust, Go, Node.js, Java, etc.
- **Contracts:** Solidity, Vyper, etc.

The protocol specification is the source of truth. These examples demonstrate concepts, not prescribe implementations.

---

## Security Considerations

### For All Implementers

⚠️ **These are reference implementations** — not production-ready code.

Before deploying:
1. Conduct thorough security audits
2. Test extensively on testnets
3. Review cryptographic implementations
4. Validate replay protection
5. Test failure modes
6. Consider rate limiting and DoS protection

---

## Testing

Each component directory includes:
- Example messages
- Expected behaviors
- Error conditions
- Test scenarios

Use these to validate your implementation against the spec.

---

## Contributing

To contribute reference implementations:

1. Follow [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Keep examples minimal and focused
3. Use neutral, vendor-independent language
4. Ensure compliance with spec
5. Add clear documentation

---

## Further Reading

- **[TGP-00 v3.4 Specification](../specs/TGP-00-v3.4-README.md)** — Complete protocol specification
- **[TGP-GLOSSARY.md](../specs/TGP-GLOSSARY.md)** — Term definitions
- **[TGP-EXT-00.md](../specs/TGP-EXT-00.md)** — Extension philosophy
- **[Examples](../examples/)** — Protocol message examples

---

**License:** Apache 2.0  
**Note:** These reference implementations are provided as-is for educational purposes.

