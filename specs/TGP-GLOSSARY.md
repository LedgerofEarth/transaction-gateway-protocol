# TGP Glossary

**Transaction Gateway Protocol — Term Definitions**

This glossary defines key terms used throughout the TGP specification. Terms are organized alphabetically for easy reference.

---

## A

### ACK
Acknowledgment message sent by gateways to confirm receipt and processing of economic messages (QUERY, SETTLE, WITHDRAW). ACK messages are not signed and do not require replay protection.

### Agent Message
Messages that enable automation and monitoring (INTENT, AGENT_STATUS, CANCEL_INTENT, STATS). Agent messages never modify economic state.

### Authentication
TGP uses dual authentication:
- **Connection Authentication** — Optional token for rate limits and access control
- **Message Authentication** — Required EIP-712 signatures for economic messages

---

## B

### Base Protocol
The core TGP specification (TGP-00 v3.4) that all implementations must support. Extensions build on top of the base protocol.

### Buyer
The party initiating a payment transaction. Buyers commit funds and sign settlement requests.

### Buyer Commitment
In ZK extension: a Poseidon hash commitment binding the buyer to transaction parameters without revealing them on-chain.

---

## C

### Canonical Hashing
Deterministic process for converting messages into a hash for signing:
1. Remove signature field
2. Sort all keys lexicographically (recursive)
3. Strip whitespace
4. UTF-8 encode
5. Apply keccak256

### Canonicalization
See Canonical Hashing.

### Chain ID
EVM chain identifier (e.g., 1 for Ethereum, 943 for PulseChain testnet). Included in signatures to prevent cross-chain replay attacks.

### COMMIT
Intent verb indicating a binding economic commitment. When a buyer or seller sends a QUERY with verb=COMMIT, they are expressing binding intent to participate in settlement.

---

## D

### Delegated Execution
Core TGP principle: gateways coordinate transaction execution without ever controlling user keys or funds. Settlement is enforced by on-chain contracts, not trusted intermediaries.

### Deterministic
Property ensuring identical inputs always produce identical outputs. TGP requires deterministic message handling for interoperability.

---

## E

### Economic Control Plane
TGP's role as a "Layer 8" protocol—above traditional network layers but below application business logic. Provides transaction routing, policy evaluation, and settlement coordination.

### Economic Message
Messages that modify settlement state: QUERY, ACK, SETTLE, WITHDRAW, ERROR. Economic messages require signatures (except TBC-generated ACK/ERROR).

### EIP-712
Ethereum standard for typed structured data hashing and signing. TGP uses EIP-712 for all economic message signatures.

### Execution Deadline
Timestamp (in milliseconds) after which a preview expires and cannot be used for settlement. Enforces preview freshness.

### Executor
Component that submits settlement transactions to blockchain. The executor receives validated settlement envelopes from the gateway and broadcasts them to the network.

### Extension
Optional protocol additions that build on the base protocol (e.g., TGP-00 v3.4-ZK). Extensions are activated by message content, not configuration flags.

---

## F

### Fallback
When extension fields are absent, behavior deterministically falls back to base protocol. Example: absence of `zk_proof` triggers standard validation.

---

## G

### Gas Mode
NEW in v3.4: Determines who pays transaction gas fees:
- **RELAY** — Gateway pays gas (gasless for user)
- **WALLET** — User pays gas with their wallet

Gas mode is advisory (not in preview hash) to allow graceful fallback.

### Gateway
Server implementing the Transaction Border Controller (TBC) role. Validates transaction intents, generates previews, verifies signatures, and coordinates settlement execution.

### Gateway-Mediated Settlement
Settlement pattern where a gateway verifies transaction validity and coordinates on-chain execution, while never holding custody of funds.

---

## I

### Intent
Economic intent expressed in QUERY message. Contains verb (COMMIT/PROPOSE), party (BUYER/SELLER), mode (DIRECT/MEDIATED), and payload.

---

## M

### Merchant
Seller in a transaction. Merchants commit to receive payment and provide goods/services.

### Message ID
Unique UUID v4 identifier for each economic message. Used for deduplication to prevent replay attacks.

---

## N

### Non-Custodial
Core TGP guarantee: gateways cannot seize or move user funds. Users retain control of their keys and assets throughout the protocol flow.

### Nonce
Monotonically increasing integer per origin_address. Used for replay protection. Each new message must have a higher nonce than the previous message from the same address.

---

## O

### Order ID
Unique identifier for a specific settlement order. Used to track commitment state and link QUERY, SETTLE, and WITHDRAW messages.

### Origin Address
The Ethereum address that signed an economic message. Recovered from the signature and must match the address claimed in the message.

---

## P

### Preview
NEW in v3.4: Cryptographically committed transaction estimate generated by the gateway. Contains:
- Committed price and fees
- Gas mode (RELAY/WALLET)
- Settlement contract binding
- Execution estimates
- Preview hash (cryptographic commitment)

### Preview Consumption
Single-use enforcement ensuring a preview can only be used once for settlement. Prevents replay attacks on previews.

### Preview Hash
keccak256 hash of canonical preview. Binds the user to specific execution parameters before settlement. Included in SETTLE message signature.

### Preview Layer
NEW in v3.4: Architecture for cryptographically committed transaction previews with gas mode determination and settlement contract binding.

---

## Q

### QUERY
Economic message expressing transaction intent. Contains party (BUYER/SELLER), verb (COMMIT/PROPOSE), and payload. Triggers preview generation.

---

## R

### Relay Protection
Three-layer system preventing message replay:
1. **Nonce** — Monotonic counter per address
2. **Timestamp** — Freshness window (5 min old, 1 min future)
3. **UUID** — Message ID deduplication

---

## S

### Seller
See Merchant.

### SETTLE
Economic message requesting settlement execution. Must include preview_hash (v3.4+). Triggers on-chain settlement transaction.

### Settlement Contract
On-chain smart contract that enforces settlement logic, holds escrow, and executes final fund transfers. Address is bound in preview.

### Settlement Executor
See Executor.

### Signature
EIP-712 cryptographic signature proving message authenticity. All economic messages (except TBC-generated ACK/ERROR) require signatures.

### SPG (Synthetic Preview Generator)
Gateway component responsible for generating previews. Resolves settlement contracts, determines gas modes, estimates costs, and computes preview hashes.

### Split Visibility
Core TGP principle: No single party has complete visibility into all transaction details. Buyers, merchants, and settlement providers see only what's necessary for their role.

---

## T

### TBC (Transaction Border Controller)
Gateway implementation that routes messages, validates intents, generates previews, verifies signatures, and coordinates settlement execution.

### TGP (Transaction Gateway Protocol)
Open protocol for trust-minimized blockchain commerce and settlement coordination.

### Timestamp
Unix epoch milliseconds indicating message creation time. Used for replay protection and freshness validation.

### Transaction Boundary Isolation
Core TGP principle: Each party operates within isolated transaction boundaries. No shared transaction identifiers across parties to prevent correlation.

### Transport Message
Lightweight messages for health, preview, and validation: PING, PONG, PREVIEW, PREVIEW_RESULT, VALIDATE, VALIDATE_RESULT. Transport messages don't modify economic state.

---

## U

### UUID
Universally Unique Identifier (v4). Required for all economic messages to enable deduplication and prevent replay.

---

## W

### Wallet
User software that holds private keys and signs TGP messages. Can be browser extension or standalone application.

### WebSocket
Bidirectional communication protocol used by TGP for real-time message exchange between wallets and gateways.

### WITHDRAW
Economic message requesting release of escrowed funds from a settlement contract. Sent by seller after settlement completion.

---

## Z

### Zero-Knowledge (ZK)
Optional TGP extension (v3.4-ZK) that enables cryptographic proof of buyer intent without revealing:
- Wallet addresses
- Transaction amounts
- Nonce values

### ZK Extension
See TGP-00 v3.4-ZK specification. Strictly optional addition to base protocol.

### ZK Proof
Groth16 zero-knowledge proof structure with components (a, b, c) that cryptographically proves buyer commitment without revealing private inputs.

---

## Notation

### MUST / MUST NOT
RFC 2119 keywords indicating mandatory requirements for compliance.

### SHOULD / SHOULD NOT
RFC 2119 keywords indicating strong recommendations.

### MAY / OPTIONAL
RFC 2119 keywords indicating permissible options.

### 0x-prefixed
Hexadecimal encoding format used for addresses, hashes, and signatures (e.g., `0xabc123...`).

---

## Related Documents

- **[TGP-00 v3.4](./TGP-00-v3.4-README.md)** — Base protocol specification
- **[TGP-00 v3.4-ZK](./TGP-00-v3.4-ZK.md)** — Zero-knowledge extension
- **[TGP-EXT-00](./TGP-EXT-00.md)** — Extension philosophy and rules
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — How to contribute

---

**License:** Apache 2.0  
**Last Updated:** 2025-01-02

