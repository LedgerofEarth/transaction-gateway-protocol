# TGP-00 v3.4 — Transaction Gateway Protocol
## Part 1: Core Protocol & Transport Layer

**An Open Protocol for Trust-Minimized Blockchain Commerce**

- **Version:** 3.4
- **Status:** Public Specification
- **Date:** 2025-01-02
- **Replaces:** TGP-00 v3.3 and TxIP-00
- **License:** Apache 2.0

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Normative Conventions](#2-normative-conventions)
3. [Introduction](#3-introduction)
4. [Protocol Overview](#4-protocol-overview)
5. [Message Categories](#5-message-categories)
6. [WebSocket Transport](#6-websocket-transport)
7. [General Message Structure](#7-general-message-structure)
8. [Canonical Hashing & Signatures](#8-canonical-hashing--signatures)
9. [Replay Protection](#9-replay-protection)
10. [Transport Messages](#10-transport-messages)

---

## 1. Abstract

**Transaction Gateway Protocol (TGP)** is an open-source protocol specification for trust-minimized, privacy-preserving blockchain commerce and settlement coordination.

TGP-00 v3.4 defines the unified message transport, authentication, canonical hashing, signature verification, replay protection, **preview layer**, routing semantics, and agent coordination model for decentralized settlement ecosystems.

This specification replaces the dual-layer architecture of TGP-00 (economic protocol) and TxIP-00 (transport/session protocol), consolidating both into a single, coherent WebSocket-based communication protocol.

### Protocol Status

- **License:** Apache 2.0
- **Governance:** Community-driven open standard
- **Adoption:** Open to any implementation complying with this specification

### This version introduces:

- **Preview Layer** — Cryptographically committed transaction previews with gas mode determination (*see Part 2, Section 1*)
- Unified envelope model for all message types
- Transport layer health checks (PING, PONG, VALIDATE)
- Canonical signing & hashing system for economic messages  
- Standardized replay-protection model (nonce, timestamp, ID)
- Extended execution estimates with settlement contract binding
- Formal authentication matrix
- Enhanced diagnostic messages (ERROR_DETAIL)
- Optional agent coordination for automation

### Reference Implementation Components

Reference implementations may provide:

- **Wallet Client** — Browser-based extension or standalone application
- **Gateway Service (TBC)** — Transaction Border Controller for routing & settlement coordination
- **Merchant Portal** — Merchant management interface
- **Settlement Contracts** — On-chain escrow and settlement logic
- **Agent Framework** — Optional automation layer

**Other implementations are encouraged and welcome.** This specification is designed to enable interoperability between any compliant TGP implementations.

---

## 2. Normative Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

- JSON examples are illustrative and MAY omit fields for brevity
- Time values are represented in Unix epoch milliseconds unless otherwise stated
- Addresses are represented as 0x-prefixed hex strings (Ethereum format)
- Hash values are represented as 0x-prefixed hex strings (keccak256)

---

## 3. Introduction

**Transaction Gateway Protocol (TGP)** is an open-source protocol specification for coordinating trust-minimized settlement, proof-of-delivery, and dual-commit escrow operations across blockchain networks.

### 3.1 Protocol Philosophy

TGP is designed as an **open standard** that any implementation can adopt. The protocol prioritizes:

- **Interoperability** — Any compliant client can communicate with any compliant gateway
- **Transparency** — All protocol rules are publicly documented
- **Decentralization** — No central authority controls the protocol
- **Privacy** — Built-in privacy preservation for commercial transactions
- **Extensibility** — Support for future settlement types and automation

### 3.2 Reference Implementations

Reference implementations demonstrate TGP compliance:

| Component | Role | Example Implementation |
|-----------|------|----------------|
| **Wallet Client** | User wallet | Browser extension or standalone app |
| **Gateway (TBC)** | Settlement coordinator | Server-side routing service |
| **Merchant Portal** | Seller interface | Web-based merchant management |
| **Contracts** | Settlement layer | Smart contracts for escrow |
| **Agent Framework** | Automation | Optional AI/agent integration |

**These components demonstrate TGP compliance but are not required.** Alternative implementations following this specification are fully supported and encouraged.

### 3.3 Protocol History

This version resolves the historical division between:

- **TxIP-00** — WebSocket/session envelope  
- **TGP-00 v3.2/v3.3** — Economic settlement protocol

By consolidating them, TGP-00 v3.4 eliminates:

- ❌ Redundant envelope structures
- ❌ Duplicate nonce/timestamp logic
- ❌ Conflicting signature semantics
- ❌ Unnecessary session-layer complexity

**All message types, transport semantics, authentication details, canonical hashing rules, signature models, preview layer, and replay-protection logic are now defined in one place.**

### 3.4 Compatibility & Migration

TGP-00 v3.4 is backward-compatible with TGP-00 v3.3 via a dual-parser migration mode (*see Part 3, Section 3*).

Implementations MAY support both v3.3 and v3.4 during transition periods, but SHOULD eventually migrate to v3.4-only for enhanced security and preview layer benefits.

### 3.5 Contributing to TGP

TGP is maintained as a community-driven specification. Contributions are welcome via:

- Protocol improvement proposals
- Implementation feedback
- Security reviews
- Interoperability testing
- Documentation improvements

**Note:** Governance and contribution processes are defined separately from this technical specification.

---

## 4. Protocol Overview

TGP operates over a persistent WebSocket connection, enabling:

- ✅ **Signed economic state transitions** (QUERY → ACK → SETTLE)
- ✅ **Preview layer** - Cryptographic commitment to price, gas, settlement contract (*see Part 2, Section 1*)
- ✅ **Transport-level health checks** (PING/PONG)
- ✅ **Pre-execution validation** (VALIDATE)
- ✅ **Detailed diagnostic error reporting** (ERROR_DETAIL)
- ✅ **Optional multi-agent coordination** (INTENT, AGENT_STATUS, STATS)

### 4.1 Design Principles

#### 4.1.1 Trustlessness

Economic messages MUST be:
- **Signed** with EIP-712 typed data
- **Canonically hashed** for determinism
- **Replay-protected** with nonce + timestamp + ID  
- **Authenticatable** via signature recovery

#### 4.1.2 Preview Immutability

**New in v3.4:** Previews MUST be (*see Part 2, Section 1 for complete specification*):
- Generated before settlement execution
- Cryptographically committed via hash
- Immutable after generation
- Bound to specific settlement contract and gas mode

#### 4.1.3 Deterministic Routing

Only economic messages:
- `QUERY`
- `ACK`
- `SETTLE`
- `WITHDRAW`

enter settlement routing.

Transport, preview, and agent messages **NEVER** modify economic state.

#### 4.1.4 Extensibility

The message model is open for:
- Agent automation
- Parallel execution
- Future settlement types
- Additional diagnostic tooling

#### 4.1.5 Minimal Overhead

WebSocket keeps connections alive with low latency; no external envelope wrapper.

---

## 5. Message Categories

TGP messages are grouped into five major categories:

### 5.1 Economic Messages

**Canonical, settlement-affecting messages:**

- `QUERY` - Intent to commit or query state
- `ACK` - Acknowledgment with preview commitment
- `SETTLE` - Settlement execution request  
- `WITHDRAW` - Withdrawal request
- `ERROR` - Economic error response

**Requirements:**

Economic messages MUST include:
- `origin_address` - Signer address
- `nonce` - Monotonically increasing counter per address
- `timestamp` - Unix epoch milliseconds
- `id` - Unique message identifier (UUID v4)
- `signature` - EIP-712 signature (except TBC-generated ACK/ERROR)

### 5.2 Transport Messages

**Lightweight, non-economic messages:**

- `PING` - Connectivity check
- `PONG` - Ping response
- `PREVIEW` - Preview generation request (*see Part 2, Section 1.3*)
- `PREVIEW_RESULT` - Preview with cryptographic commitment (*see Part 2, Section 1.4*)
- `VALIDATE` - Pre-signature validation
- `VALIDATE_RESULT` - Validation response

**Requirements:**

Transport messages:
- MUST NOT require signatures
- MUST NOT be routed to economic handlers
- MUST NOT modify settlement state
- Inherit connection authentication

### 5.3 Diagnostic Messages

**Debug and monitoring:**

- `ERROR_DETAIL` - Rich diagnostic information

Provides human-oriented detail beyond canonical `ERROR`.

### 5.4 Agent Messages (Optional)

**Multi-agent orchestration:**

- `INTENT` - Agent intent declaration
- `CANCEL_INTENT` - Intent cancellation
- `AGENT_STATUS` - Agent status update
- `STATS` - Performance statistics

**Requirements:**

Agent messages:
- Are OPTIONAL
- MUST NOT influence settlement
- MAY be ignored by TBC

---

## 6. WebSocket Transport

TGP-00 v3.4 uses a persistent, bidirectional WebSocket connection as its transport layer. All TGP messages are sent directly as JSON objects over this connection without an external envelope.

### 6.1 Connection Model

**WebSocket Endpoint Format:**

```
wss://<host>/tgp
```

The connection MAY include optional query parameters for authentication or routing context.

#### 6.1.1 Connection Flow

1. **Client initiates WebSocket connection**
   ```
   wss://tbc.example.com/tgp?auth_token=<token>
   ```

2. **Upon open, client SHOULD send PING to:**
   - Verify connectivity
   - Receive TBC environment metadata
   - Synchronize timestamp (clock skew mitigation)
   - Establish optional session context

3. **TBC replies with PONG, confirming:**
   - Connection acceptance
   - Protocol version support (v3.4)
   - Chain environment  
   - Server time (for timestamp offset estimation)

4. **After PONG, both sides may exchange any TGP message type**

5. **Connection remains open until:**
   - Client closes it
   - Server closes it
   - Network failure occurs
   - Inactivity timeout triggers

#### 6.1.2 Inactivity Timeout

A TGP server SHOULD close idle connections after:

- **60 seconds** of inactivity for unauthenticated connections
- **5–15 minutes** for authenticated connections (implementation-dependent)

Clients MUST be prepared to reconnect.

### 6.2 Authentication

TGP-00 v3.4 supports a dual authentication model:

1. **Connection-Scoped Authentication** (OPTIONAL)
2. **Message-Scoped Authentication** (REQUIRED for economic messages)

Authentication MUST NOT rely on TxIP-00 mechanisms; TxIP is deprecated.

#### 6.2.1 Connection Authentication (Optional)

A client MAY provide an authentication token to obtain:

- Higher rate limits
- Access to merchant/agent-specific APIs (STATS, AGENT_STATUS)
- Access to PREVIEW of merchant-owned orders
- Custom server behaviors

**Token Delivery Methods:**

**A. URL Query Parameter**
```
wss://tbc.example.com/tgp?auth_token=abc123
```

**B. WebSocket Headers**
```
Authorization: Bearer abc123
```

**C. Initial PING Message**
```json
{
  "type": "PING",
  "timestamp": 1736382201000,
  "auth_token": "abc123"
}
```

**Properties:**

- Connection auth is OPTIONAL
- Connection auth DOES NOT replace required signatures for economic messages
- Connection auth MAY enable restricted diagnostic features

#### 6.2.2 Message Authentication (Required for Economic Messages)

All economic messages (`QUERY`, `SETTLE`, `WITHDRAW`) MUST include:

1. **EIP-712 Signature** - Typed data signature over canonical message
2. **origin_address** - Expected signer address
3. **Signature Recovery** - TBC recovers signer from signature
4. **Address Verification** - Recovered address MUST match `origin_address`

**TBC-generated messages** (ACK, ERROR) are NOT signed but inherit request context.

#### 6.2.3 Authentication Matrix

| Message Type | Signature Required | Connection Auth | Notes |
|--------------|-------------------|-----------------|-------|
| QUERY | ✅ Yes (EIP-712) | Optional | From buyer/seller |
| ACK | ❌ No | N/A | TBC-generated |
| SETTLE | ✅ Yes (EIP-712) | Optional | From buyer |
| WITHDRAW | ✅ Yes (EIP-712) | Optional | From seller |
| ERROR | ❌ No | N/A | TBC-generated |
| PING | ❌ No | Optional | Health check |
| PONG | ❌ No | N/A | TBC response |
| PREVIEW | ❌ No | Optional | Client request |
| PREVIEW_RESULT | ❌ No | N/A | TBC response |
| VALIDATE | ❌ No | Optional | Pre-sign check |
| VALIDATE_RESULT | ❌ No | N/A | TBC response |
| ERROR_DETAIL | ❌ No | Optional | Diagnostic |
| INTENT | ⚠️ Optional | Recommended | Agent message |
| AGENT_STATUS | ⚠️ Optional | Recommended | Agent message |
| STATS | ❌ No | Required | Restricted access |

### 6.3 Connection Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ CLIENT                          TBC                 │
├─────────────────────────────────────────────────────┤
│ 1. Open WebSocket                                   │
│ ──────────────────────────────────────────────────> │
│                                                      │
│ 2. Send PING                                        │
│ ──────────────────────────────────────────────────> │
│                                                      │
│                      3. Return PONG                 │
│ <────────────────────────────────────────────────── │
│                                                      │
│ 4. Send QUERY (signed)                              │
│ ──────────────────────────────────────────────────> │
│                                                      │
│                      5. Generate Preview            │
│                      6. Return ACK (with preview)   │
│ <────────────────────────────────────────────────── │
│                                                      │
│ 7. User reviews preview                             │
│ 8. Send SETTLE (signed, includes preview_hash)      │
│ ──────────────────────────────────────────────────> │
│                                                      │
│                      9. Verify preview_hash         │
│                      10. Execute settlement         │
│                      11. Return ACK (success)       │
│ <────────────────────────────────────────────────── │
│                                                      │
│ 12. Close connection (optional)                     │
│ ──────────────────────────────────────────────────> │
└─────────────────────────────────────────────────────┘
```

> **Note:** Steps 5-6 involve the Preview Layer (*see Part 2, Section 1*)

### 6.4 Reconnection Strategy

**Client Behavior on Disconnect:**

1. Detect WebSocket close event
2. Wait exponential backoff: `min(2^attempt * 1000ms, 30000ms)`
3. Attempt reconnection
4. After 5 failed attempts, notify user
5. Resume from last known state

**Heartbeat Model:**

Clients SHOULD send PING every:
- **20–30 seconds** for CPW/CPE
- **60 seconds** for merchant backend
- **5 minutes** for agent systems

If no PONG is received after 2 intervals, the client SHOULD reconnect.

**TBC Behavior:**

- TBC SHOULD maintain order state across reconnections
- TBC MAY use connection auth to correlate sessions
- TBC MUST NOT rely on connection persistence for settlement guarantees

**Safety Notes:**

- Nonce reuse causes rejection
- Settlement actions MUST NOT be automatically retried unless idempotent

---

## 7. General Message Structure

All TGP messages share a common base structure:

```json
{
  "type": "MESSAGE_TYPE",
  "tgp_version": "3.4",
  ...message-specific fields...
}
```

### 7.1 Required Fields (All Messages)

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Message type identifier |
| `tgp_version` | string | Protocol version ("3.4") |

### 7.2 Required Fields (Economic Messages Only)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique message identifier (UUID v4) |
| `nonce` | integer | Monotonically increasing per origin_address |
| `timestamp` | integer | Unix epoch milliseconds |
| `origin_address` | string | 0x-prefixed Ethereum address |
| `chain_id` | integer | EVM chain ID |
| `signature` | string | 0x-prefixed EIP-712 signature (except ACK/ERROR) |

### 7.3 Fields Prohibited in Economic Messages

Economic messages MUST NOT include:

- `auth_token` - Use connection-level auth instead
- Nested envelopes - TxIP-00 is deprecated
- Arbitrary metadata outside defined structures

### 7.4 JSON Canonicalization Requirements

Before hashing/signing:

- Keys MUST be sorted lexicographically (recursive for nested objects)
- JSON MUST NOT contain whitespace
- Null values MUST be omitted
- `signature` field MUST NOT be included in the hash domain

This ensures signature stability across languages and implementations.

### 7.5 Message Rejection Rules

A TGP implementation MUST reject messages that:

- Omit required fields → `P002_MISSING_FIELD`
- Include unexpected fields → `P003_INVALID_TYPE`
- Mismatch expected types → `P001_INVALID_JSON`
- Exceed size limits (*see Part 3, Section 1*) → `P004_SIZE_EXCEEDED`
- Fail canonical signature verification → `A100_INVALID_SIGNATURE`
- Use incorrect `tgp_version` → `P005_VERSION_MISMATCH`
- Use reserved or unknown message types → `P003_INVALID_TYPE`

### 7.6 Message Type Identifiers

| Type | Category | Description |
|------|----------|-------------|
| `QUERY` | Economic | Buyer/seller intent |
| `ACK` | Economic | TBC acknowledgment |
| `SETTLE` | Economic | Settlement execution |
| `WITHDRAW` | Economic | Withdrawal request |
| `ERROR` | Economic | Error response |
| `PING` | Transport | Health check |
| `PONG` | Transport | Health response |
| `PREVIEW` | Transport | Preview request |
| `PREVIEW_RESULT` | Transport | Preview response |
| `VALIDATE` | Transport | Pre-signature validation |
| `VALIDATE_RESULT` | Transport | Validation response |
| `ERROR_DETAIL` | Diagnostic | Extended error info |
| `INTENT` | Agent | Agent intent |
| `CANCEL_INTENT` | Agent | Intent cancellation |
| `AGENT_STATUS` | Agent | Status update |
| `STATS` | Agent | Performance stats |

---

## 8. Canonical Hashing & Signatures

Economic messages in TGP-00 v3.4 require cryptographic non-repudiation. This section defines:

- Canonical message structure
- Hashing rules
- Signature generation
- Signature verification procedures

Signatures MUST use **ECDSA secp256k1**, identical to Ethereum's signing standard.

### 8.1 Canonical Signing Domain

Economic messages MUST include all canonical fields below. These fields form the signing domain:

```json
{
  "type": "QUERY",                 // or SETTLE, WITHDRAW
  "tgp_version": "3.4",
  "id": "uuid-123",
  "nonce": 42,
  "timestamp": 1736382501000,
  "origin_address": "0x123...",
  "intent": { ... },               // QUERY only
  "order_id": "ORD-5001",          // SETTLE / WITHDRAW
  "preview_hash": "0x...",         // SETTLE only (v3.4)
  "chain_id": 943
}
```

**Notes:**

- `signature` MUST NOT be included in the domain
- `intent` MUST be canonicalized recursively (keys sorted, no nulls)
- `preview_hash` is REQUIRED for SETTLE in v3.4 (*see Part 2, Section 1*)
- Fields MUST NOT be omitted unless declared optional in the spec

### 8.2 Canonicalization Procedure

Before computing the hash:

1. Remove `signature` field
2. Sort all top-level keys lexicographically
3. Sort nested object keys as well (recursive)
4. Strip whitespace entirely
5. Use UTF-8 JSON encoding
6. Omit null values

**Example canonical form:**

```json
{"chain_id":943,"id":"uuid-123","intent":{"mode":"DIRECT","party":"BUYER","verb":"COMMIT"},"nonce":12,"origin_address":"0xabc...","timestamp":1736382501000,"tgp_version":"3.4","type":"QUERY"}
```

This MUST be byte-for-byte identical across implementations.

### 8.3 Hash Computation

The canonical JSON string is hashed using:

```
keccak256( utf8_bytes(canonical_json) )
```

**Result:** A 32-byte hash used for ECDSA signing.

### 8.4 Signature Generation (Client-Side)

The client produces:

```
signature = sign(canonical_hash, private_key)
```

The signature MUST:
- Be 65 bytes
- Encode {r, s, v}
- Be hex-prefixed (0x…)

**Resulting message:**

```json
{
  "type": "QUERY",
  "id": "uuid-123",
  "nonce": 42,
  "timestamp": 1736382501000,
  "origin_address": "0x123...",
  "intent": { ... },
  "chain_id": 943,
  "signature": "0xABC123..."
}
```

### 8.5 Signature Verification (TBC-Side)

Upon receiving an economic message, the TBC MUST:

1. Remove `signature` field
2. Rebuild canonical form
3. Recompute hash
4. Recover signer from signature
5. Compare recovered address to `origin_address`

**If mismatch:**

```json
{
  "type": "ERROR",
  "code": "A101_ADDRESS_MISMATCH",
  "message": "Signature does not match origin_address",
  "origin_address": "<provided>",
  "recovered_address": "<from_signature>"
}
```

**If signature invalid:**

```json
{
  "type": "ERROR",
  "code": "A100_INVALID_SIGNATURE",
  "message": "Signature recovery failed"
}
```

Signature verification MUST occur before any routing or replay checks.

---


## 9. Replay Protection

Economic messages MUST be resistant to replay attacks:

- Within the same TBC instance
- Across multiple connections
- Across time windows
- Across chains

Replay protection uses three layers:
1. **nonce** - Monotonic counter per address
2. **timestamp** - Freshness window
3. **id** - UUID deduplication

This triple system ensures robust protection even if one layer fails.

### 9.1 Nonce Semantics

Each `origin_address` maintains an independent nonce sequence:

```
0, 1, 2, 3, …
```

**Rules:**

- Nonce MUST increase strictly (`msg.nonce > last_seen_nonce`)
- Nonce MUST be an integer ≥ 0
- Nonce MUST be unique per address
- If nonce is reused or too low → REJECT with `R200_NONCE_TOO_LOW`

**Client Responsibilities:**

Clients MUST maintain persistent nonce state per address:

```
tgp_nonce_<origin_address> = N
```

After successful message acknowledgment, increment:

```
tgp_nonce_<origin_address> = N + 1
```

#### 9.1.1 Nonce Initialization

A new address may start at nonce 0.

If a client loses track of nonce state:

1. Client sends a message with `nonce = 0`
2. TBC rejects with:

```json
{
  "type": "ERROR",
  "code": "R200_NONCE_TOO_LOW",
  "expected_nonce": 42,
  "received_nonce": 0
}
```

3. Client updates local nonce → `expected_nonce`
4. Client retries message

Clients SHOULD persist nonce to durable storage.

#### 9.1.2 TBC Nonce State Machine

TBC MUST track:

```
last_seen_nonce[origin_address] → integer
```

On receiving new message:

```
if msg.nonce <= last_seen_nonce:
    reject: R200_NONCE_TOO_LOW
else:
    last_seen_nonce = msg.nonce
    accept
```

### 9.2 Timestamp Freshness

Economic messages MUST include `timestamp` (Unix ms).

A message is valid if:

```
(tbc_time - 300000) <= msg.timestamp <= (tbc_time + 60000)
```

**Meaning:**

- ≤ 5 minutes old → allowed
- ≤ 1 minute in the future → allowed
- Otherwise → REJECT

**Rejection Example:**

```json
{
  "type": "ERROR",
  "code": "R202_TIMESTAMP_TOO_OLD",
  "server_time": 1736382501000,
  "your_timestamp": 1736381501000,
  "age_ms": 1000000
}
```

Clients SHOULD synchronize using PING/PONG timestamps:

```
clock_skew = PONG.server_time - PING.timestamp
```

### 9.3 Message ID (UUID) Deduplication

TBC MUST maintain a deduplication ledger:

```
seen_ids[uuid] → timestamp
```

**Rules:**

- If a UUID is seen again → reject (`R204_MESSAGE_ID_DUPLICATE`)
- TBC MAY garbage-collect IDs after 24 hours
- This prevents repeat submissions of identical economic messages

### 9.4 Cross-Chain Replay Protection

Including `chain_id` in the canonical hash prevents:

- Replaying a message from PulseChain → Ethereum
- Replaying a message from Base → Arbitrum
- Replaying across TBC clusters if configured by chain

This mechanism is REQUIRED for multi-chain safety.

---

## 10. Transport Messages

Transport messages provide:

- Health monitoring
- Preview generation (*see Part 2, Section 1 for complete Preview Layer specification*)
- Preflight validation
- Metadata retrieval

Transport messages never modify chain state and do not require signatures.

### 10.1 PING

Used for:
- Connection health
- Clock skew estimation
- Initial `auth_token` provisioning

#### Format

```json
{
  "type": "PING",
  "timestamp": 1736382201000,
  "auth_token": "optional"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `timestamp` | Yes | Client time (Unix ms) |
| `auth_token` | No | Optional connection-level auth |

### 10.2 PONG

Sent in response to PING.

#### Format

```json
{
  "type": "PONG",
  "tgp_version": "3.4",
  "tbc_version": "1.0.0",
  "timestamp": 1736382201500,
  "server_time": 1736382201600,
  "chain_env": {
    "chain_id": 943,
    "network": "pulsechain-testnet-v4"
  }
}
```

Clients SHOULD compute:

```
clock_skew = server_time - client_timestamp
```

### 10.3 PREVIEW & PREVIEW_RESULT

> **Note:** Complete Preview Layer specification is in Part 2, Section 1.
>
> This section provides only basic transport format. For preview generation flow, hash computation, gas mode determination, settlement contract binding, and preview consumption semantics, see Part 2, Section 1.

#### PREVIEW Request (Basic Format)

```json
{
  "type": "PREVIEW",
  "envelope": {
    "order_id": "ORD-5001",
    "amount": "1000000000000000",
    "buyer": "0xabc...",
    "seller": "0xdef...",
    "chain_id": 943
  }
}
```

#### PREVIEW_RESULT Response (Basic Format)

```json
{
  "type": "PREVIEW_RESULT",
  "valid": true,
  "reason": null,
  "estimated_gas": "250000",
  "estimated_cost_wei": "300000000000000",
  "queue_position": 3
}
```

**For complete PREVIEW_RESULT structure including preview_hash, gas_mode, settlement_contract binding, and canonical hash computation, see Part 2, Section 1.4.**

### 10.4 VALIDATE (Static Signature & Structure Check)

VALIDATE checks correctness of the envelope and signature without executing settlement.

Used by UIs and CPW/CPE before user signing.

#### Request Format

```json
{
  "type": "VALIDATE",
  "envelope": {
    "type": "SETTLE",
    "tgp_version": "3.4",
    "id": "uuid-123",
    "nonce": 42,
    "timestamp": 1736382501000,
    "origin_address": "0x123...",
    "order_id": "ORD-5002",
    "preview_hash": "0x...",
    "chain_id": 943
  },
  "signature": "0xABC123...",
  "check_nonce": true
}
```

#### Behavior

VALIDATE MUST:
- Check schema
- Rebuild canonical form
- Recompute hash
- Verify signature → `origin_address`
- If `check_nonce=true` → validate nonce freshness
- Validate timestamp window

VALIDATE MUST NOT:
- Deduct nonce
- Modify TBC state
- Route the message
- Trigger settlement

### 10.5 VALIDATE_RESULT

#### Format

```json
{
  "type": "VALIDATE_RESULT",
  "valid": true,
  "signature_valid": true,
  "nonce_valid": true,
  "timestamp_valid": true,
  "expected_nonce": 42
}
```

**If invalid signature:**

```json
{
  "type": "VALIDATE_RESULT",
  "valid": false,
  "signature_valid": false,
  "message": "Signature does not match origin_address"
}
```

---

## End of Part 1

**Continue to:**
- [Part 2: Economic Messages & Preview Layer](./TGP-00_v3.4_Part2_Messages.md) — Complete Preview Layer specification, economic message formats, routing rules
- [Part 3: Implementation Guide & Security](./TGP-00_v3.4_Part3_Implementation.md) — Size constraints, security considerations, migration guide, error catalog
