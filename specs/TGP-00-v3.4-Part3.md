# TGP-00 v3.4 — Transaction Gateway Protocol
## Part 3: Implementation Guide & Security

**An Open Protocol for Trust-Minimized Blockchain Commerce**

- **Version:** 3.4
- **Status:** Public Specification
- **Date:** 2025-01-02

---

## Table of Contents

1. [Message Size Constraints](#1-message-size-constraints)
2. [Security Considerations](#2-security-considerations)
3. [Migration Path (v3.3 → v3.4)](#3-migration-path)
4. [Implementation Checklist](#4-implementation-checklist)
5. [Glossary](#5-glossary)
6. [Appendix A: Canonicalization Examples](#appendix-a-canonicalization-examples)
7. [Appendix B: Error Code Catalog](#appendix-b-error-code-catalog)
8. [Appendix C: Compliance Requirements](#appendix-c-compliance-requirements)

---

## 1. Message Size Constraints

All TGP-00 messages MUST adhere to explicit size limits to:

- Prevent resource exhaustion
- Minimize DoS surface
- Maintain predictable performance

These limits include all serialized JSON after removing whitespace.

### 1.1 Transport Message Limits

| Message Type | Max Size |
|--------------|----------|
| PING | ≤ 256 bytes |
| PONG | ≤ 1 KB |
| PREVIEW | ≤ 64 KB |
| PREVIEW_RESULT | ≤ 64 KB |
| VALIDATE | ≤ 64 KB |
| VALIDATE_RESULT | ≤ 64 KB |
| ERROR_DETAIL | ≤ 4 KB |

**Notes:**

- PREVIEW and VALIDATE include envelope payloads that may be large (order metadata, contract templates, etc.)
- PING must remain extremely small to allow frequent health checks

### 1.2 Economic Message Limits

| Message Type | Max Size |
|--------------|----------|
| QUERY | ≤ 64 KB |
| ACK | ≤ 4 KB |
| SETTLE | ≤ 64 KB |
| WITHDRAW | ≤ 64 KB |
| ERROR | ≤ 4 KB |

64 KB allows complex intents for commerce, including:

- Full metadata
- Audit trails
- Rich structured payloads
- Multi-item purchases
- NFT/cart interactions

### 1.3 Agent Message Limits

| Message Type | Max Size |
|--------------|----------|
| INTENT | ≤ 4 KB |
| AGENT_STATUS | ≤ 1 KB |
| CANCEL_INTENT | ≤ 4 KB |
| STATS | ≤ 4 KB |

Agents MUST remain lightweight and non-blocking.

### 1.4 Constraint Enforcement

If a message exceeds its size:

TBC MUST respond with:

```json
{
  "type": "ERROR",
  "code": "P004_SIZE_EXCEEDED",
  "message": "Message exceeds maximum allowed size for type QUERY",
  "max_size": 65536,
  "actual_size": 98304
}
```

The TBC MUST NOT attempt partial parsing of oversized messages.

---

## 2. Security Considerations

This section enumerates all security expectations for TGP-00 v3.4.

### 2.1 Threat Model

TGP assumes:

- Attackers may inject malformed messages
- Attackers may attempt replay or reorder attacks
- Attackers may try signature spoofing
- Man-in-the-middle is mitigated by WSS transport
- Attackers may attempt DoS through message flooding
- Engineered malicious load (oversized messages, frequent requests)
- **Preview replay attacks** (NEW in v3.4)
- **Preview hash manipulation** (NEW in v3.4)

TGP-00 provides robust mitigations for each.

### 2.2 Signature Security

TGP requires:

- All economic messages MUST be signed
- Signature recovery MUST match `origin_address`
- `chain_id` MUST be included in canonical domain
- **`preview_hash` MUST be included in SETTLE canonical domain** (NEW in v3.4)
- `signature` MUST be excluded from the canonical hash

This prevents:

- Spoofing
- Cross-chain replay
- Message forgery
- Man-in-the-middle rewriting
- **Preview substitution** (v3.4)

### 2.3 Replay Attack Prevention

Replay protection includes:

- Nonce per origin
- Timestamp window
- UUID deduplication
- Canonical hash with `chain_id`
- **Preview single-use consumption** (NEW in v3.4)
- **Preview expiration deadlines** (NEW in v3.4)
- Connection-independent authentication

This prevents:

- Session hijacking
- Replaying historical commitments
- Replaying messages across TBC clusters
- Replaying transactions across chains
- **Replaying settled previews** (v3.4)
- **Using stale previews** (v3.4)

### 2.4 Preview Layer Security (NEW in v3.4)

**Preview-specific threats and mitigations:**

| Threat | Mitigation |
|--------|------------|
| Preview replay | Single-use consumption + `executing` flag |
| Stale preview | `execution_deadline_ms` enforcement |
| Price manipulation | `amount_wei` in canonical hash |
| Contract substitution | `settlement_contract` in canonical hash |
| Gas price manipulation | `max_fee_per_gas_wei` in canonical hash |
| Preview hash forgery | Cryptographic hash verification |
| Concurrent settlement | Atomic `executing` flag |

**Preview verification flow:**

```rust
// 1. Verify preview exists
let preview = db.get_preview_by_order(&order_id)?;

// 2. Verify hash match (prevents substitution)
if settle_msg.preview_hash != preview.preview_hash {
    return Err(PreviewHashMismatch);
}

// 3. Verify not expired (prevents stale usage)
if now_ms > preview.execution_deadline_ms {
    return Err(PreviewExpired);
}

// 4. Atomic execution prevention (prevents replay)
db.mark_preview_executing(&order_id)?;

// 5. Execute settlement
let result = execute_settlement(&preview)?;

// 6. Mark consumed (prevents future replay)
db.mark_preview_consumed(&order_id)?;
```

### 2.5 DoS & Resource Exhaustion Mitigations

The TBC MUST implement:

- Message size constraints (Section 1)
- Rate limits per connection
- Per-address rate limits
- Executor queue depth limits
- Anti-bruteforce backoff
- Immediate rejection of PONG from clients
- **Preview generation rate limiting** (v3.4)

PREVIEW and VALIDATE are specifically bounded at 64 KB to defend CPU and memory use.

### 2.6 Authorization Model

Authorization is layered:

**Layer 1 — Connection Authentication**

- Optional `auth_token`
- Helps rate limits, merchant rules, analytics
- Never grants permission to modify economic state

**Layer 2 — Message Authentication**

- Required signature for economic actions
- Required `origin_address`
- Ensures non-repudiation

**Layer 3 — Replay Validation**

- Nonce
- Timestamp
- UUID
- **Preview consumption** (v3.4)

All layers MUST pass.

### 2.7 TBC MUST NOT Hold User Private Keys

**Critical rule:**

The TBC MUST NEVER hold private keys or sign anything on behalf of users.

Private keys exist only:

- In user wallets (browser extensions or standalone applications)
- In user agents controlled by the user

This eliminates:

- Custodial risk
- Signature trust compromise
- Wallet-draining risk

### 2.8 Settlement Execution Safety

The settlement executor MUST:

- Only submit pre-built envelopes
- Never modify economic messages
- Use deterministic transaction generation
- Never bypass signature verification
- Never escalate privileges via connection authentication
- **Only execute from valid, unconsumed previews** (v3.4)

The executor MUST NOT:

- Infer signing authority
- Infer user intent
- Modify envelope contents
- Combine multiple envelopes
- Produce aggregations without explicit instruction
- **Execute without preview verification** (v3.4)

### 2.9 Transport Message Safety

Transport messages are intentionally read-only.

They MUST NOT:

- Trigger economic state transitions
- Trigger settlement
- Trigger commitment recording
- Modify nonce or timestamp rules
- Produce irreversible actions
- **Bypass preview layer** (v3.4)

This protects system safety from:

- AI agents
- Integrations
- Merchant dashboards
- Third-party monitoring tools

### 2.10 Clock Skew Tolerance

Clock skew window defined in Part 1, Section 9.2 MUST be enforced exactly.

Clients SHOULD maintain internal clock offset by:

```javascript
skew = pong.server_time - ping.timestamp
```

A skew > 1 minute SHOULD force CPW/CPE to display a warning.

### 2.11 Security Recommendations for Implementers

**TBC implementers SHOULD:**

- Log all signature failures with anonymized fields
- Maintain rolling replay-protection buffers
- Rate-limit PREVIEW requests
- Rate-limit VALIDATE requests
- Implement exponential backoff on repeated failure
- Apply circuit breakers to executor queue
- **Monitor preview consumption patterns for abuse** (v3.4)
- **Alert on preview expiration rate anomalies** (v3.4)

**Wallet implementers SHOULD:**

- Persist nonce state
- Retry with server-provided `expected_nonce`
- Warn if clock drift detected
- Require explicit user confirmation for COMMIT
- Warn if PREVIEW indicates high gas cost
- **Display preview details before signing SETTLE** (v3.4)
- **Warn if preview near expiration** (v3.4)
- **Store preview_hash securely until SETTLE** (v3.4)

---

## 3. Migration Path (v3.3 → v3.4)

TGP-00 v3.4 introduces the Preview Layer while maintaining compatibility with v3.3.

This section defines the transition sequence for clients, TBC services, and merchant systems.

### 3.1 Migration Philosophy

TGP v3.4 is designed to:

- Add preview layer without breaking v3.3 clients
- Improve transparency and user protection
- Provide graceful degradation
- Allow incremental adoption
- Maintain backward compatibility during transition

### 3.2 Migration Timeline

#### Phase 1 — Dual Support (Recommended: 2–4 weeks)

TBC MUST support:

| Supported | Description |
|-----------|-------------|
| TGP v3.4 with Preview Layer | NEW unified format with preview_hash |
| TGP v3.3 without Preview Layer | Legacy compatibility (auto-generate previews) |

During this phase:

- CPW/CPE may use v3.3 while new implementation is tested
- TBC MUST auto-generate previews for v3.3 QUERY messages
- TBC MUST accept SETTLE without `preview_hash` (v3.3 mode)
- TBC SHOULD emit warnings on v3.3 usage

#### Phase 2 — Gradual Client Adoption (Recommended: 2–4 weeks)

Clients begin transitioning:

- Wallet implementations v3.4+ must emit TGP v3.4 with `preview_hash`
- Merchant portals must support preview display
- Integrations must handle ACK with `preview_hash`
- Gateways should log v3.3 usage for monitoring

#### Phase 3 — TGP v3.4 Only (Mandatory after Phase 1+2)

TBC MAY completely require:

- `preview_hash` in SETTLE messages
- Preview verification for all settlements
- Preview expiration enforcement

If a v3.3 SETTLE (without `preview_hash`) is received:

```json
{
  "type": "ERROR",
  "code": "P005_VERSION_MISMATCH",
  "message": "SETTLE requires preview_hash (TGP v3.4+)",
  "upgrade_required": true
}
```

### 3.3 Breaking Changes (Summary)

| Feature | v3.3 | v3.4 |
|---------|------|------|
| Preview Layer | Not present | REQUIRED |
| `preview_hash` in SETTLE | Not present | REQUIRED |
| `preview_hash` in ACK | Not present | REQUIRED |
| Gas mode determination | Manual | Automatic via preview |
| Settlement contract binding | Dynamic | Bound in preview |
| Preview expiration | Not enforced | ENFORCED |
| Preview consumption | Not tracked | Single-use enforced |

### 3.4 Client Migration Checklist

Clients MUST:

- [ ] Request previews via QUERY
- [ ] Store `preview_hash` from ACK
- [ ] Include `preview_hash` in SETTLE
- [ ] Sign SETTLE with `preview_hash` in canonical domain
- [ ] Display preview details to user before signing
- [ ] Handle `PREVIEW_EXPIRED` errors
- [ ] Handle `PREVIEW_HASH_MISMATCH` errors
- [ ] Handle gas mode fallback prompts
- [ ] Update signature logic to include `preview_hash`
- [ ] Persist preview state across sessions

### 3.5 TBC Migration Checklist

TBC MUST:

- [ ] Implement preview generation for QUERY
- [ ] Compute canonical `preview_hash`
- [ ] Store previews with consumption tracking
- [ ] Return `preview_hash` in ACK
- [ ] Verify `preview_hash` in SETTLE
- [ ] Enforce `execution_deadline_ms`
- [ ] Mark previews consumed after settlement
- [ ] Prevent preview replay with `executing` flag
- [ ] Support gas mode fallback
- [ ] Support dual v3.3/v3.4 mode during transition
- [ ] Generate preview on-demand for v3.3 clients
- [ ] Eventually require v3.4 (reject v3.3)

---

## 4. Implementation Checklist

### 4.1 Wallet Implementation

**Core Protocol (Part 1):**

- [ ] Implement canonical JSON signing
- [ ] Persist nonce per `origin_address`
- [ ] Implement timestamp window checks
- [ ] Use VALIDATE before showing signature prompt
- [ ] Reject unsigned economic messages
- [ ] Handle WebSocket reconnection with exponential backoff
- [ ] Synchronize clock using PING/PONG

**Preview Layer (Part 2, Section 1):**

- [ ] Store `preview_hash` from ACK
- [ ] Include `preview_hash` in SETTLE message
- [ ] Sign SETTLE with `preview_hash` in canonical domain
- [ ] Display preview details to user before signing
- [ ] Show gas mode (RELAY vs WALLET)
- [ ] Show settlement contract address
- [ ] Show estimated total cost
- [ ] Warn if preview near expiration
- [ ] Handle `PREVIEW_EXPIRED` gracefully
- [ ] Handle gas mode fallback (RELAY → WALLET)
- [ ] Persist preview state across sessions

**Economic Messages (Part 2, Section 2):**

- [ ] Implement QUERY with optional `force_wallet`
- [ ] Handle ACK with preview commitment
- [ ] Implement SETTLE with `preview_hash`
- [ ] Handle ERROR responses gracefully

**Security (Part 3, Section 2):**

- [ ] Never expose private keys
- [ ] Validate all TBC responses
- [ ] Verify `preview_hash` matches stored value
- [ ] Check preview expiration before signing
- [ ] Require explicit user confirmation for COMMIT
- [ ] Warn if high gas cost detected

### 4.2 Gateway Implementation

**Core Protocol (Part 1):**

- [ ] Validate signature → `origin_address`
- [ ] Enforce strict nonce rules
- [ ] Enforce timestamp windows
- [ ] Enforce message size limits (Section 1)
- [ ] Maintain replay-protection DB (UUID, nonce, timestamp)
- [ ] Support WebSocket connections
- [ ] Implement PING/PONG health checks
- [ ] Implement VALIDATE endpoint

**Preview Layer (Part 2, Section 1):**

- [ ] Generate previews for all QUERY messages
- [ ] Resolve settlement contract (registry/factory/verified hint)
- [ ] Determine gas mode (relay/wallet)
- [ ] Estimate execution gas
- [ ] Generate unique `preview_nonce`
- [ ] Set `execution_deadline_ms`
- [ ] Compute canonical `preview_hash`
- [ ] Store previews with `consumed` flag
- [ ] Index previews by `order_id`
- [ ] Return `preview_hash` in ACK
- [ ] Verify `preview_hash` on SETTLE
- [ ] Enforce `execution_deadline_ms`
- [ ] Mark preview `executing` before settlement
- [ ] Mark preview `consumed` after settlement
- [ ] Handle gas mode fallback (RELAY → WALLET)
- [ ] Garbage-collect expired previews

**Economic Messages (Part 2, Section 2):**

- [ ] Process QUERY with commitment recording
- [ ] Generate ACK with preview
- [ ] Verify SETTLE preview requirements
- [ ] Route to settlement executor
- [ ] Handle WITHDRAW requests

**Routing (Part 2, Section 4):**

- [ ] Route transport messages correctly
- [ ] Route economic messages through validation pipeline
- [ ] Enforce preview verification for SETTLE
- [ ] Never route transport messages to executor

**Security (Part 3, Section 2):**

- [ ] Never hold user private keys
- [ ] Validate all signatures
- [ ] Enforce replay protection
- [ ] Rate-limit PREVIEW requests
- [ ] Monitor preview consumption patterns
- [ ] Alert on anomalies
- [ ] Implement executor isolation
- [ ] Use deterministic transaction generation

---

## 5. Glossary

| Term | Definition |
|------|------------|
| **TGP** | Transaction Gateway Protocol |
| **TBC** | Transaction Border Controller |
| **CPW** | CoreProve Wallet |
| **CPE** | CoreProve Extension |
| **Economic Message** | Messages that change settlement state (QUERY, SETTLE, WITHDRAW) |
| **Transport Message** | Messages for health, preview, validation (PING, PREVIEW, VALIDATE) |
| **Agent Message** | Messages for automation or monitoring (INTENT, STATS) |
| **Canonicalization** | Deterministic sorting + serialization of JSON |
| **Nonce** | Increasing integer used to prevent replay |
| **Executor** | Component that submits settlement txs to chain |
| **COMMIT** | Binding economic intent |
| **Preview** | Cryptographically committed transaction estimate (v3.4) |
| **Preview Hash** | keccak256 hash of canonical preview (v3.4) |
| **Gas Mode** | RELAY (TBC pays) or WALLET (user pays) execution mode (v3.4) |
| **Settlement Contract** | On-chain contract where settlement is executed |
| **SPG** | Synthetic Preview Generator (TBC component) |
| **Execution Deadline** | Timestamp after which preview cannot be settled |
| **Preview Consumption** | Single-use enforcement of preview settlement |

---

## Appendix A: Canonicalization Examples

Canonicalization is defined in Part 1, Section 8.2, but concrete examples help ensure deterministic implementation.

### A.1 Non-Canonical Message (v3.4)

```json
{
  "intent": {
    "party": "BUYER",
    "verb": "COMMIT"
  },
  "timestamp": 1736382501000,
  "id": "uuid-123",
  "nonce": 10,
  "type": "QUERY",
  "chain_id": 943,
  "tgp_version": "3.4",
  "origin_address": "0x123"
}
```

### A.2 Canonical Form

Remove whitespace → sort keys:

```json
{"chain_id":943,"id":"uuid-123","intent":{"party":"BUYER","verb":"COMMIT"},"nonce":10,"origin_address":"0x123","timestamp":1736382501000,"tgp_version":"3.4","type":"QUERY"}
```

This is the string passed into:

```
keccak256(utf8_bytes(canonical_json))
```

### A.3 SETTLE Canonicalization (v3.4)

**Non-canonical:**

```json
{
  "signature": "0x123...",
  "timestamp": 1736382601000,
  "type": "SETTLE",
  "preview_hash": "0xabc...",
  "id": "uuid-999",
  "order_id": "ORD-22",
  "nonce": 92,
  "chain_id": 943,
  "origin_address": "0xBuyer123"
}
```

**Canonical (signature removed, keys sorted):**

```json
{"chain_id":943,"id":"uuid-999","nonce":92,"order_id":"ORD-22","origin_address":"0xBuyer123","preview_hash":"0xabc...","timestamp":1736382601000,"type":"SETTLE"}
```

> **Note:** `preview_hash` is included in canonical domain for SETTLE (v3.4)

### A.4 Preview Canonicalization (v3.4)

**Preview object (non-canonical):**

```json
{
  "preview_hash": "0x789...",
  "gas_mode": "RELAY",
  "settlement_contract": "0x5678...",
  "amount_wei": "1000000000000000000",
  "order_id": "ORD-22",
  "merchant_id": "acme-store",
  "asset": "0x0",
  "asset_type": "NATIVE",
  "seller": "0xSellerDEF",
  "chain_id": 943,
  "execution_deadline_ms": 1736383201000,
  "risk_score": 0.15,
  "gas_estimate": {
    "execution_gas_limit": "250000",
    "max_fee_per_gas_wei": "1200000000",
    "total_cost_wei": "300000000000000"
  },
  "preview_version": "1.0",
  "preview_source": "SPG-v2",
  "preview_nonce": "0xnonce123..."
}
```

**Canonical preview (for hash computation):**

```json
{"amount_wei":"1000000000000000000","asset":"0x0","asset_type":"NATIVE","chain_id":943,"execution_deadline_ms":1736383201000,"gas_estimate":{"execution_gas_limit":"250000","max_fee_per_gas_wei":"1200000000","total_cost_wei":"300000000000000"},"merchant_id":"acme-store","order_id":"ORD-22","preview_nonce":"0xnonce123...","preview_source":"SPG-v2","preview_version":"1.0","risk_score":0.15,"seller":"0xsellerdef","settlement_contract":"0x5678"}
```

**Fields excluded from hash:**
- `gas_mode` (allows fallback)
- `preview_hash` (cannot include itself)
- `paid_by` (UI metadata)

---

## Appendix B: Error Code Catalog

A complete list of all error codes defined in TGP-00 v3.4.

### B.1 Protocol Errors (P000–P099)

| Code | Description |
|------|-------------|
| P001_INVALID_JSON | Malformed JSON payload |
| P002_MISSING_FIELD | Required field absent |
| P003_INVALID_TYPE | Unknown message type |
| P004_SIZE_EXCEEDED | Message too large |
| P005_VERSION_MISMATCH | Unsupported TGP version |

### B.2 Authentication Errors (A100–A199)

| Code | Description |
|------|-------------|
| A100_INVALID_SIGNATURE | Signature fails recovery |
| A101_ADDRESS_MISMATCH | Recovered signer ≠ origin_address |
| A102_UNAUTHORIZED | Invalid auth_token or access restriction |

### B.3 Replay Protection Errors (R200–R299)

| Code | Description |
|------|-------------|
| R200_NONCE_TOO_LOW | nonce ≤ last_seen_nonce |
| R201_NONCE_GAP | Nonce jumps too far (optional enforcement) |
| R202_TIMESTAMP_TOO_OLD | Timestamp older than 5 minutes |
| R203_TIMESTAMP_TOO_NEW | Timestamp more than 1 minute in future |
| R204_MESSAGE_ID_DUPLICATE | ID already seen |

### B.4 Settlement Errors (S300–S399)

| Code | Description |
|------|-------------|
| S300_ORDER_NOT_FOUND | order_id not recognized |
| S301_WRONG_STATE | Order in incompatible state |
| S302_INSUFFICIENT_COMMITMENT | Missing buyer or seller commit |
| S303_TTL_EXPIRED | Commit TTL expired |
| S304_CONTRACT_PAUSED | Contract is paused |
| S305_EXECUTION_FAILED | Settlement executor error |

### B.5 Preview Errors (V400–V499) — NEW in v3.4

| Code | Description |
|------|-------------|
| V400_PREVIEW_GENERATION_FAILED | SPG failure |
| V401_PREVIEW_NOT_FOUND | Unknown order_id |
| V402_PREVIEW_HASH_MISMATCH | Hash doesn't match |
| V403_PREVIEW_EXPIRED | Past execution_deadline |
| V404_PREVIEW_ALREADY_CONSUMED | Already settled |
| V405_INVALID_SETTLEMENT_CONTRACT | Contract verification failed |
| V406_PREVIEW_EXECUTION_IN_PROGRESS | Concurrent settlement attempt |

### B.6 Rate Limit Errors (L500–L599)

| Code | Description |
|------|-------------|
| L500_RATE_LIMITED | Request throttled |
| L501_QUOTA_EXCEEDED | Daily quota exhausted |

---

## Appendix C: Compliance Requirements

### C.1 Wallet Implementations MUST

- Implement canonical JSON signing
- Persist nonce per `origin_address`
- **Use PREVIEW before enabling SETTLE** (v3.4)
- **Store preview_hash and include in SETTLE** (v3.4)
- **Display preview details to user before signing** (v3.4)
- Use VALIDATE before showing signature prompt
- Reject unsigned economic messages
- Provide the user clear preview of tx cost
- **Warn if preview near expiration** (v3.4)

### C.2 Gateway Implementations MUST

- Validate signature → `origin_address`
- Enforce strict nonce and timestamp rules
- Enforce message size limits
- Maintain replay-protection DB (UUID, nonce, timestamp)
- Reject legacy TxIP-00 messages
- Maintain versioned chain environments
- Ensure executor isolation
- **Generate previews for all QUERY messages** (v3.4)
- **Store previews with consumption tracking** (v3.4)
- **Verify preview_hash on SETTLE** (v3.4)
- **Enforce execution_deadline_ms** (v3.4)
- **Mark previews consumed after settlement** (v3.4)
- **Prevent preview replay** (v3.4)

### C.3 Merchant Portal MUST

- Display preview details clearly
- Show gas mode (RELAY vs WALLET)
- Show settlement contract address
- Show total cost estimate
- Never bypass preview verification
- Handle preview expiration gracefully

---

## End of Part 3

**See also:**
- [Part 1: Core Protocol & Transport](./TGP-00_v3.4_Part1_Core_Protocol.md) — WebSocket transport, authentication, canonical hashing, replay protection
- [Part 2: Economic Messages & Preview Layer](./TGP-00_v3.4_Part2_Messages.md) — **Complete Preview Layer specification**, economic message formats, routing rules

---

**TGP-00 v3.4 — COMPLETE SPECIFICATION**

This completes the three-part specification for TGP-00 v3.4. All preview-related content is consolidated in Part 2, Section 1, and referenced throughout the specification where needed.
