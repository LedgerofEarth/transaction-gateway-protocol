# TGP-00 v3.4 — Transaction Gateway Protocol
## Part 2: Economic Messages & Preview Layer

**A CoreProve Protocol Specification**

- **Version:** 3.4
- **Status:** Draft for Review
- **Date:** 2025-12-13

---

## Table of Contents

1. [Preview Layer (NEW in v3.4)](#1-preview-layer)
2. [Economic Messages](#2-economic-messages)
3. [Message Schema Extensions](#3-message-schema-extensions)
4. [Routing Rules](#4-routing-rules)
5. [Agent Messages](#5-agent-messages)
6. [Complete Message Examples](#6-complete-message-examples)

---

## 1. Preview Layer

**Status:** NEW in TGP-00 v3.4

The Preview Layer provides cryptographically committed transaction previews that bind buyers to specific execution parameters before settlement. This section consolidates all preview-related functionality into a single specification.

### 1.1 Purpose & Architecture

#### 1.1.1 Purpose

The Preview Layer provides:

- **Price commitment** — Immutable amount, asset, fees
- **Gas mode determination** — Relay vs wallet execution  
- **Settlement contract binding** — Specific contract address
- **Execution estimates** — Gas, cost, timing
- **Replay protection** — Single-use preview consumption
- **User transparency** — Clear cost disclosure before signing

#### 1.1.2 Architecture Overview

```
QUERY (buyer intent)
    ↓
TBC processes QUERY
    ↓
SPG (Synthetic Preview Generator)
    ├─ Resolve settlement contract (factory/registry)
    ├─ Determine gas mode (relay/wallet)
    ├─ Estimate gas costs
    └─ Generate preview_nonce
    ↓
Compute preview_hash = keccak256(canonical_preview)
    ↓
Store preview with hash (consumed=false)
    ↓
Return ACK with preview_hash
    ↓
Client stores preview_hash for SETTLE
    ↓
SETTLE references preview_hash
    ↓
TBC verifies hash match + not consumed
    ↓
Execute settlement
    ↓
Mark preview consumed (consumed=true)
```

#### 1.1.3 Key Properties

- **Immutability** — Preview cannot be modified after generation
- **Single-use** — Preview can only be settled once
- **Cryptographic binding** — preview_hash commits to all parameters
- **Expiration** — Previews have execution deadlines
- **Privacy-preserving** — gas_mode not in hash (allows fallback)

---

### 1.2 Preview Structure

#### 1.2.1 Complete Preview Object

```json
{
  "order_id": "string",
  "merchant_id": "string",
  "amount_wei": "string",
  "asset": "address",
  "asset_type": "NATIVE|ERC20",
  "seller": "address",
  "chain_id": "uint256",
  "execution_deadline_ms": "uint256",
  "risk_score": "float",
  
  "settlement_contract": "address",
  "gas_mode": "RELAY|WALLET",
  
  "gas_estimate": {
    "execution_gas_limit": "string",
    "max_fee_per_gas_wei": "string",
    "total_cost_wei": "string"
  },
  
  "preview_version": "string",
  "preview_source": "string",
  "preview_nonce": "bytes32",
  
  "preview_hash": "bytes32"
}
```

#### 1.2.2 Field Descriptions

| Field | Type | Canonical? | Description |
|-------|------|------------|-------------|
| `order_id` | string | ✅ Yes | Unique order identifier |
| `merchant_id` | string | ✅ Yes | Merchant identifier |
| `amount_wei` | string | ✅ Yes | Payment amount in wei |
| `asset` | address | ✅ Yes | Payment token address (0x0 for native) |
| `asset_type` | string | ✅ Yes | NATIVE or ERC20 |
| `seller` | address | ✅ Yes | Seller address |
| `chain_id` | uint256 | ✅ Yes | EVM chain ID |
| `execution_deadline_ms` | uint256 | ✅ Yes | Unix ms deadline |
| `risk_score` | float | ✅ Yes | Risk assessment (0.0-1.0) |
| `settlement_contract` | address | ✅ Yes | Bound settlement contract |
| `gas_estimate` | object | ✅ Yes | All subfields canonical |
| `preview_version` | string | ✅ Yes | Preview schema version |
| `preview_source` | string | ✅ Yes | SPG identifier |
| `preview_nonce` | bytes32 | ✅ Yes | Unique preview nonce |
| **`gas_mode`** | string | ❌ **No** | Allows relay→wallet fallback |
| `paid_by` | string | ❌ No | UI hint only |

> **Critical:** `gas_mode` is intentionally NOT in the canonical hash. This allows TBC to switch from RELAY to WALLET mode if gas relay becomes unavailable without requiring a new preview.

---

### 1.3 Preview Generation Flow

#### 1.3.1 Trigger: QUERY Message

Preview generation is triggered when TBC receives a QUERY message:

```json
{
  "type": "QUERY",
  "tgp_version": "3.4",
  "id": "uuid-123",
  "nonce": 7,
  "timestamp": 1736382520000,
  "origin_address": "0xBuyer123",
  "intent": {
    "verb": "COMMIT",
    "party": "BUYER",
    "mode": "DIRECT",
    "payload": {
      "order_id": "ORD-22",
      "amount_wei": "1000000000000000000",
      "asset": "NATIVE",
      "merchant_id": "acme-store"
    }
  },
  "chain_id": 943,
  
  // NEW in v3.4: Optional hints
  "force_wallet": false,
  "settlement_contract": null,
  
  "signature": "0xabc123..."
}
```

**New QUERY fields (v3.4):**

- `force_wallet` (boolean, optional) — If true, forces gas_mode=WALLET
- `settlement_contract` (address, optional) — Advisory hint (TBC verifies)

#### 1.3.2 Settlement Contract Resolution

**TBC MUST resolve settlement contract via one of these methods:**

**Method A: Registry Lookup (Recommended)**
```
settlement_contract = registry.getContract(merchant_id, chain_id)
```

**Method B: Factory Deployment**
```
settlement_contract = factory.getOrDeploy(merchant_id, params)
```

**Method C: User Hint (Verified)**
```
if QUERY.settlement_contract:
    verify settlement_contract is valid
    verify settlement_contract matches merchant_id
    use settlement_contract
else:
    use Method A or B
```

**Security:** TBC MUST verify any user-provided settlement_contract address.

#### 1.3.3 Gas Mode Determination

**TBC determines gas_mode based on:**

1. **User preference:** If `QUERY.force_wallet == true` → `gas_mode = WALLET`
2. **Gas relay availability:**
   ```
   if gas_relay_balance >= estimated_cost:
       gas_mode = RELAY
   else:
       gas_mode = WALLET
   ```
3. **Merchant policy:** Merchant may restrict to WALLET mode
4. **Default:** If no preference, default to RELAY if available

**Gas mode values:**

- **RELAY** — TBC pays gas, user doesn't need native token
- **WALLET** — User pays gas with their wallet

> **Important:** `gas_mode` is NOT in preview_hash, allowing graceful fallback if relay becomes unavailable.

#### 1.3.4 Gas Estimation

**TBC MUST estimate execution gas:**

```javascript
gas_estimate = {
    execution_gas_limit: "250000",
    max_fee_per_gas_wei: "1200000000",  // 1.2 gwei
    total_cost_wei: "300000000000000"    // gas_limit * max_fee
}
```

**Estimation methods:**

1. Static estimate from contract metadata
2. eth_estimateGas simulation
3. Historical gas usage for merchant

**TBC SHOULD provide conservative estimates** (add 10-20% buffer).

#### 1.3.5 Preview Nonce Generation

**Generate unique preview_nonce:**

```javascript
preview_nonce = keccak256(
    order_id + 
    merchant_id + 
    timestamp + 
    random_entropy
)
```

Preview nonce MUST be unique per preview to prevent hash collisions.

#### 1.3.6 Execution Deadline

**Set execution deadline:**

```javascript
execution_deadline_ms = current_time_ms + 15_MINUTES
```

**Typical values:**
- **Direct pay:** 15 minutes
- **Escrow with preview:** 1 hour
- **Complex multi-step:** 24 hours

After deadline, TBC MUST reject SETTLE with `PREVIEW_EXPIRED`.

---

### 1.4 Canonical Preview Hash

**The preview_hash is the cryptographic commitment to all execution parameters.**

#### 1.4.1 Fields Included in Hash

**Canonical fields (alphabetically sorted):**

```javascript
{
    "amount_wei": preview.amount_wei,
    "asset": preview.asset.toLowerCase(),
    "asset_type": preview.asset_type,
    "chain_id": preview.chain_id,
    "execution_deadline_ms": preview.execution_deadline_ms,
    "gas_estimate": {
        "execution_gas_limit": preview.gas_estimate.execution_gas_limit,
        "max_fee_per_gas_wei": preview.gas_estimate.max_fee_per_gas_wei,
        "total_cost_wei": preview.gas_estimate.total_cost_wei
    },
    "merchant_id": preview.merchant_id,
    "order_id": preview.order_id,
    "preview_nonce": preview.preview_nonce,
    "preview_source": preview.preview_source,
    "preview_version": preview.preview_version,
    "risk_score": preview.risk_score,
    "seller": preview.seller.toLowerCase(),
    "settlement_contract": preview.settlement_contract.toLowerCase()
}
```

**Fields NOT in hash:**

- ❌ `gas_mode` — Allows relay→wallet fallback
- ❌ `paid_by` — UI metadata only
- ❌ `preview_hash` — Cannot include itself

#### 1.4.2 Hash Computation

```javascript
// 1. Build canonical object (fields sorted alphabetically)
const canonical = {
    amount_wei: preview.amount_wei,
    asset: preview.asset.toLowerCase(),
    // ... all canonical fields sorted
};

// 2. Serialize to JSON (no whitespace)
const canonical_json = JSON.stringify(canonical);

// 3. Compute keccak256 hash
const preview_hash = keccak256(utf8_bytes(canonical_json));
```

**Result:** 0x-prefixed 32-byte hash

#### 1.4.3 Hash Verification

**When TBC receives SETTLE:**

```javascript
// 1. Load stored preview
const stored_preview = db.get_preview_by_order(order_id);

// 2. Verify hash match
if (SETTLE.preview_hash !== stored_preview.preview_hash) {
    throw PreviewHashMismatch;
}

// 3. Verify not expired
if (current_time_ms > stored_preview.execution_deadline_ms) {
    throw PreviewExpired;
}

// 4. Verify not consumed
if (stored_preview.consumed) {
    throw PreviewAlreadyConsumed;
}

// 5. Proceed with execution
```

---

### 1.5 Preview Storage & Lifecycle

#### 1.5.1 Storage Model

**TBC MUST store previews with:**

```rust
struct PreviewRecord {
    preview: Preview,
    preview_hash: String,
    created_at_ms: u64,
    consumed: bool,
    executing: bool,  // Prevents replay during execution
}
```

**Indexing:**

- Primary key: `preview_hash`
- Secondary index: `order_id` (for SETTLE lookup)

#### 1.5.2 Preview States

| State | consumed | executing | Description |
|-------|----------|-----------|-------------|
| **AVAILABLE** | false | false | Ready for settlement |
| **EXECUTING** | false | true | Settlement in progress |
| **CONSUMED** | true | false | Successfully settled |
| **EXPIRED** | false | false | Past execution_deadline_ms |

#### 1.5.3 State Transitions

```
AVAILABLE
    ↓ (SETTLE received)
EXECUTING
    ↓ (Settlement succeeds)
CONSUMED

EXECUTING
    ↓ (Settlement fails)
AVAILABLE (with retry allowed)
```

**Atomic transition:**

```rust
// Mark executing BEFORE execution
db.mark_preview_executing(order_id)?;

// Attempt execution
let result = execute_settlement(...)?;

// Mark consumed AFTER success
db.mark_preview_consumed(order_id)?;
```

This prevents replay during the execution window.

#### 1.5.4 Preview Expiration

**TBC MUST enforce execution deadline:**

```javascript
if (current_time_ms > preview.execution_deadline_ms) {
    return ERROR {
        code: "PREVIEW_EXPIRED",
        deadline_ms: preview.execution_deadline_ms,
        current_ms: current_time_ms
    };
}
```

**Expired previews:**

- MUST NOT be consumed
- SHOULD be garbage-collected after 24 hours
- MAY be replaced with new preview via new QUERY

---

### 1.6 Preview in ACK Message

**When TBC returns ACK after QUERY, it MUST include preview_hash:**

```json
{
  "type": "ACK",
  "tgp_version": "3.4",
  "ref_id": "uuid-123",
  "status": "COMMIT_RECORDED",
  "timestamp": 1736382502000,
  
  // CRITICAL: Preview commitment
  "preview_hash": "0x1234abcd...",
  
  // Non-canonical execution hints
  "gas_mode": "RELAY",
  "settlement_contract": "0x5678...",
  "estimated_total_cost_wei": "300000000000000",
  
  "order_state": {
    "buyer_committed": true,
    "seller_committed": false
  }
}
```

**ACK preview fields:**

| Field | Canonical? | Description |
|-------|------------|-------------|
| `preview_hash` | ✅ Required | Cryptographic commitment |
| `gas_mode` | ❌ Advisory | Execution mode hint |
| `settlement_contract` | ❌ Advisory | Contract address for UI |
| `estimated_total_cost_wei` | ❌ Advisory | Total cost estimate |

> **Client MUST store `preview_hash` for subsequent SETTLE message.**

---

### 1.7 Preview in SETTLE Message

**SETTLE MUST reference preview_hash:**

```json
{
  "type": "SETTLE",
  "tgp_version": "3.4",
  "id": "uuid-999",
  "nonce": 92,
  "timestamp": 1736382601000,
  "origin_address": "0xBuyer123",
  
  "order_id": "ORD-22",
  "preview_hash": "0x1234abcd...",
  
  "chain_id": 943,
  "signature": "0xddd000..."
}
```

**SETTLE preview requirements:**

1. `preview_hash` MUST match stored preview
2. Preview MUST NOT be expired
3. Preview MUST NOT be consumed
4. Signature MUST be over canonical SETTLE (including `preview_hash`)

**TBC verification:**

```rust
// 1. Load preview by order_id
let preview = db.get_preview_by_order(&msg.order_id)?;

// 2. Verify hash match
if msg.preview_hash != preview.preview_hash {
    return Err(PreviewHashMismatch);
}

// 3. Verify not expired
if now_ms > preview.execution_deadline_ms {
    return Err(PreviewExpired);
}

// 4. Mark executing (prevents replay)
db.mark_preview_executing(&msg.order_id)?;

// 5. Verify signature over preview_hash
verify_eip712_signature(&msg)?;

// 6. Execute settlement
let tx = execute_settlement(&preview)?;

// 7. Mark consumed
db.mark_preview_consumed(&msg.order_id)?;
```

---

### 1.8 Error Handling

#### 1.8.1 Preview-Specific Errors

| Code | Meaning | Retryable |
|------|---------|-----------|
| `PREVIEW_GENERATION_FAILED` | SPG failure | ❌ |
| `PREVIEW_NOT_FOUND` | Unknown order_id | ❌ |
| `PREVIEW_HASH_MISMATCH` | Hash doesn't match | ❌ |
| `PREVIEW_EXPIRED` | Past execution_deadline | ❌ |
| `PREVIEW_ALREADY_CONSUMED` | Already settled | ❌ |
| `INVALID_SETTLEMENT_CONTRACT` | Contract verification failed | ❌ |

#### 1.8.2 Error Responses

**Preview hash mismatch:**

```json
{
  "type": "ERROR",
  "code": "PREVIEW_HASH_MISMATCH",
  "message": "Provided preview_hash does not match stored preview",
  "expected_hash": "0x1234...",
  "provided_hash": "0x5678...",
  "order_id": "ORD-22"
}
```

**Preview expired:**

```json
{
  "type": "ERROR",
  "code": "PREVIEW_EXPIRED",
  "message": "Preview has expired",
  "execution_deadline_ms": 1736383201000,
  "current_time_ms": 1736383501000,
  "order_id": "ORD-22"
}
```

#### 1.8.3 Error → Session State Mapping

| Error Category | Resulting Session State |
|----------------|-------------------------|
| PREVIEW generation | INVALIDATED |
| PREVIEW_HASH_MISMATCH | INVALIDATED |
| PREVIEW_EXPIRED | INVALIDATED |
| PREVIEW_ALREADY_CONSUMED | INVALIDATED |

> **Important:** Preview errors are terminal. Client MUST request new preview via new QUERY.

---

### 1.9 Gas Mode Fallback

**Gas mode is intentionally NOT in preview_hash.**

This allows graceful fallback:

```
Preview generated with gas_mode=RELAY
    ↓
User approves and signs SETTLE
    ↓
At settlement time, relay balance insufficient
    ↓
TBC switches to gas_mode=WALLET
    ↓
TBC requests user to re-sign transaction for wallet mode
    ↓
Settlement proceeds with wallet-paid gas
```

**Implementation:**

```rust
let gas_mode = if preview.gas_mode == "RELAY" {
    if gas_relay_available() {
        "RELAY"
    } else {
        warn!("Gas relay unavailable, switching to WALLET");
        "WALLET"
    }
} else {
    "WALLET"
};

execute_settlement_with_mode(preview, gas_mode)?;
```

**User experience:**

1. If relay → wallet fallback occurs, TBC returns `GAS_MODE_CHANGED` warning
2. Client prompts user: "Gas relay unavailable. Proceed with wallet gas?"
3. User re-signs transaction with wallet gas
4. Settlement proceeds

---

### 1.10 Preview Layer Security Properties

**The Preview Layer guarantees:**

1. **Price immutability** — User commits to exact amount_wei
2. **Contract binding** — Settlement executes on verified contract only
3. **Gas transparency** — User sees cost before signing
4. **Replay protection** — Single-use preview consumption
5. **Expiration safety** — Stale previews cannot be used
6. **Fallback safety** — Gas mode switch doesn't require new preview

**Attack mitigations:**

| Attack | Mitigation |
|--------|------------|
| Preview replay | Single-use consumption + executing flag |
| Stale preview | Execution deadline enforcement |
| Price manipulation | Canonical hash over amount_wei |
| Contract substitution | settlement_contract in canonical hash |
| Gas price manipulation | max_fee_per_gas_wei in canonical hash |

---

### 1.11 Implementation Checklist

**TBC implementers MUST:**

- [ ] Generate previews for all QUERY messages
- [ ] Compute canonical preview_hash correctly
- [ ] Store previews with consumed flag
- [ ] Index previews by order_id
- [ ] Verify preview_hash on SETTLE
- [ ] Enforce execution_deadline_ms
- [ ] Prevent replay with executing flag
- [ ] Mark consumed after successful execution
- [ ] Support gas mode fallback
- [ ] Return preview_hash in ACK

**Client implementers MUST:**

- [ ] Store preview_hash from ACK
- [ ] Include preview_hash in SETTLE
- [ ] Sign SETTLE with preview_hash in canonical domain
- [ ] Display preview details to user before signing
- [ ] Handle PREVIEW_EXPIRED errors
- [ ] Handle gas mode fallback prompts

---

## 2. Economic Messages

Economic messages modify escrow state, settlement state, or execution flow. They require:

- Signatures (Section 8, Part 1)
- Nonce validation (Section 9.1, Part 1)
- Timestamp freshness (Section 9.2, Part 1)
- Message ID deduplication (Section 9.3, Part 1)

Economic messages follow a strict processing pipeline:

```
Signature → Replay Protection → Routing → Settlement Execution → ACK
```

### 2.1 QUERY

QUERY is how a buyer or seller expresses an economic intent to participate in a settlement.

A QUERY with `intent.verb = "COMMIT"` is a binding commitment.

#### 2.1.1 QUERY Format

```json
{
  "type": "QUERY",
  "tgp_version": "3.4",
  "id": "uuid-12345",
  "nonce": 42,
  "timestamp": 1736382501000,
  "origin_address": "0xBuyerOrSeller...",

  "intent": {
    "verb": "COMMIT",            // Required: COMMIT or PROPOSE
    "party": "BUYER",            // BUYER or SELLER
    "mode": "DIRECT",            // DIRECT or MEDIATED
    "payload": {                 // Enriched context
      "order_id": "ORD-5001",
      "amount_wei": "1000000000000",
      "asset": "NATIVE",
      "merchant_id": "acme-store",
      "metadata": {
        "note": "Purchase confirmation",
        "ref": "inv-123"
      }
    }
  },
  
  // NEW in v3.4: Preview hints
  "force_wallet": false,
  "settlement_contract": null,

  "chain_id": 943,
  "signature": "0xABC..."
}
```

#### 2.1.2 Intent Verbs

| Verb | Meaning |
|------|---------|
| `COMMIT` | A binding commitment to participate in settlement |
| `PROPOSE` | Non-binding intent (e.g., negotiation, marketplace) |

For v3.4, most flows will use **COMMIT**.

#### 2.1.3 QUERY → Commitment State Machine

TBC MUST track commitments independently for each order:

```javascript
commit_state[order_id] = {
    buyer_committed: bool,
    seller_committed: bool
}
```

**Processing rules:**

1. Verify signature → `origin_address`
2. Update commitment table
3. **Trigger preview generation** (new in v3.4)
4. If both buyer & seller have committed → send ACK to both and mark order ready
5. If only one committed → send ACK to that party only
6. If commitment already exists → idempotent success

---

### 2.2 ACK

ACK is emitted by the TBC to acknowledge economic messages.

ACK is never signed and never requires nonce/timestamp checks.

#### 2.2.1 Format (v3.4)

```json
{
  "type": "ACK",
  "tgp_version": "3.4",
  "ref_id": "uuid-12345",
  "status": "COMMIT_RECORDED",
  "timestamp": 1736382502000,
  
  // NEW in v3.4: Preview commitment
  "preview_hash": "0x1234abcd...",
  
  // Non-canonical execution hints
  "gas_mode": "RELAY",
  "settlement_contract": "0x5678...",
  "estimated_total_cost_wei": "300000000000000",
  
  "order_state": {
    "buyer_committed": true,
    "seller_committed": false
  }
}
```

**ACK statuses:**

| Status | Meaning |
|--------|---------|
| `COMMIT_RECORDED` | Commitment stored, preview generated |
| `EXECUTED` | Settlement executed successfully |
| `PROCESSING` | Settlement queued for execution |

`ref_id` matches the original QUERY/SETTLE/WITHDRAW message ID.

ACK MUST be sent after:
- A commitment is recorded
- A settlement is queued
- A withdrawal request is accepted

ACK is NOT a guarantee of final settlement.

---

### 2.3 SETTLE

SETTLE instructs the TBC to produce a settlement envelope and transmit it to the settlement executor.

SETTLE is used once both parties have committed.

#### 2.3.1 Requirements Before SETTLE

TBC MUST validate:

- Buyer and seller have committed
- Order not expired
- Order not already settled
- Contract not paused
- **Preview exists and not consumed** (new in v3.4)
- **Preview not expired** (new in v3.4)
- **preview_hash matches** (new in v3.4)
- Nonce / timestamp valid
- Signature valid

#### 2.3.2 SETTLE Format (v3.4)

```json
{
  "type": "SETTLE",
  "tgp_version": "3.4",
  "id": "uuid-777",
  "nonce": 51,
  "timestamp": 1736382520000,
  "origin_address": "0xBuyerOrSeller",

  "order_id": "ORD-5001",
  "preview_hash": "0x1234abcd...",
  
  "chain_id": 943,
  "signature": "0xSignature..."
}
```

**New fields in v3.4:**

- `preview_hash` (REQUIRED) — Reference to committed preview

#### 2.3.3 SETTLE → Executor Flow

Once validated:

1. TBC verifies preview_hash
2. TBC loads preview
3. TBC marks preview executing
4. TBC builds settlement envelope from preview
5. TBC forwards envelope to local executor
6. Executor sends transaction to chain
7. Executor reports status back to TBC
8. TBC marks preview consumed
9. TBC emits ACK to all subscribed clients

---

### 2.4 WITHDRAW — Settlement Withdrawal Message (UPDATED)

The `WITHDRAW` message is an **economic message** used by the **seller** to release escrowed funds from a finalized settlement contract into seller custody.

`WITHDRAW` does **not** initiate payment and MUST NOT modify pricing, gas, or preview state. It is a terminal settlement action.

#### 2.4.1 Purpose

`WITHDRAW` represents the seller's authenticated request to execute the **escrow release** of funds that were previously committed and funded via a successful `SETTLE`.

The protocol treats withdrawal as a **state transition**:

```
FUNDED → WITHDRAWN
```

#### 2.4.2 Preconditions (Normative)

A `WITHDRAW` message **MUST be rejected** unless **all** of the following conditions are met:

1. The referenced `order_id` exists
2. A corresponding `SETTLE` has:
   - Executed successfully on-chain
   - Been confirmed by the settlement contract
3. The settlement contract reports:
   - `state == FUNDED`
   - `withdrawn == false`
4. Any required:
   - Timelock
   - Dispute window
   - Proof-of-delivery window
   defined by the settlement contract **has elapsed**
5. The `origin_address` **matches the seller address bound at settlement time**

**TBC MUST validate these conditions via on-chain reads.** TBC MUST NOT infer withdrawal eligibility from off-chain state alone.

#### 2.4.3 WITHDRAW Format

```json
{
  "type": "WITHDRAW",
  "tgp_version": "3.4",
  "id": "uuid-v4",
  "nonce": 73,
  "timestamp": 1736389900000,
  "origin_address": "0xseller...",
  "order_id": "ORD-5001",
  "chain_id": 943,
  "signature": "0x..."
}
```

#### 2.4.4 Canonical Signing Domain (UPDATED)

The canonical signing domain for `WITHDRAW` **MUST include**:

```json
{
  "type": "WITHDRAW",
  "tgp_version": "3.4",
  "id": "uuid-v4",
  "nonce": 73,
  "timestamp": 1736389900000,
  "origin_address": "0xseller...",
  "order_id": "ORD-5001",
  "chain_id": 943
}
```

**Notes:**

- `preview_hash` MUST NOT be included
- `order_id` MUST be present
- `signature` MUST NOT be included in the hash domain

#### 2.4.5 Idempotency Rules (NEW)

Withdrawal operations MUST be **idempotent**.

If a `WITHDRAW` message is received for an `order_id` whose settlement has already been withdrawn:

- TBC MUST NOT submit a second on-chain transaction
- TBC MUST return:

```json
{
  "type": "ERROR",
  "code": "W301_ALREADY_WITHDRAWN",
  "order_id": "ORD-5001",
  "message": "Settlement already withdrawn"
}
```

This behavior ensures safe retries across:
- WebSocket reconnects
- Client crashes
- Agent-driven automation

#### 2.4.6 On-Chain Finality Requirement (NEW)

To mitigate chain reorganization risk:

- TBC **SHOULD enforce a minimum confirmation threshold** before allowing withdrawal
- RECOMMENDED minimum: **≥ 5 confirmations** on Ethereum-class chains

If the settlement has insufficient confirmations:

```json
{
  "type": "ERROR",
  "code": "W210_SETTLEMENT_NOT_FINAL",
  "confirmations": 2,
  "required": 5
}
```

Settlement contracts MAY alternatively enforce finality internally.

#### 2.4.7 Withdrawal Execution Semantics

Upon successful validation:

1. TBC submits exactly **one** withdrawal transaction to the settlement contract
2. The settlement contract:
   - Releases escrowed funds to the seller
   - Permanently marks the settlement as withdrawn
3. TBC returns an `ACK` indicating success

Withdrawal MUST be **irreversible** once executed.

#### 2.4.8 Error Codes (NEW)

The following withdrawal-specific error codes are added to the canonical error catalog:

| Code | Description |
|---|---|
| `W200_NO_SUCH_ORDER` | Unknown `order_id` |
| `W201_NO_SETTLEMENT` | Settlement not executed |
| `W202_NOT_SELLER` | origin_address mismatch |
| `W203_TIMELOCK_ACTIVE` | Withdrawal window not open |
| `W210_SETTLEMENT_NOT_FINAL` | Insufficient confirmations |
| `W301_ALREADY_WITHDRAWN` | Withdrawal already completed |
| `W500_CONTRACT_REJECTED` | On-chain revert |

#### 2.4.9 Security Properties

This design guarantees:

- No premature escrow release
- No double-withdrawal
- No reliance on TBC trust
- Deterministic auditability
- Safe automation by agents

---

### 2.5 ERROR (Economic Context)

Errors triggered during economic message handling MUST use the ERROR type.

#### Example

```json
{
  "type": "ERROR",
  "code": "S302_INSUFFICIENT_COMMITMENT",
  "message": "Seller has not yet committed",
  "order_id": "ORD-5001"
}
```

**Full error code catalog is in Part 3, Appendix C.**

---

## 3. Message Schema Extensions

This section formalizes the concrete **QUERY / ACK / SETTLE schema changes** implied by the Preview Layer (Section 1), without re-describing behavior.

This section defines **additive extensions** to existing TGP transport messages to support the Preview Layer.

No existing fields are removed or reinterpreted.

### 3.1 QUERY Message Extensions

```rust
struct QUERY {
    ref_id: String,
    chain_id: u64,
    
    // Existing fields omitted for brevity
    
    // NEW in v3.4 — Gas mode override
    force_wallet: bool,
    
    // OPTIONAL — client-provided settlement hint
    settlement_contract: Option<Address>,
}
```

**Rules:**

- `force_wallet == true` **forces GasMode::Wallet**
- If omitted or false → gas mode auto-detection applies
- `settlement_contract` is **advisory only**
  - Subject to full verification (Section 1.3.2)
  - Never trusted implicitly

### 3.2 ACK Message Extensions

```rust
struct ACK {
    ref_id: String,
    status: "COMMIT_RECORDED" | "EXECUTED" | "PROCESSING",
    
    // Commitment anchor (NEW in v3.4)
    preview_hash: String,
    
    // Non-canonical execution hints
    gas_mode: "RELAY" | "WALLET",
    
    // Settlement disclosure (UI only)
    settlement_contract: Address,
    estimated_total_cost_wei: String,
    
    order_state: OrderState,
    error: Option<TransportError>,
}
```

**Rules:**

- `preview_hash` is the **sole canonical commitment**
- `gas_mode` MUST NOT be signed or hashed
- Settlement address is included for **display & verification**, not mutation

### 3.3 SETTLE Message Extensions

```rust
struct SETTLE {
    ref_id: String,
    order_id: String,
    
    // Preview commitment (NEW in v3.4)
    preview_hash: String,
    
    // Buyer proof
    signature: String,
    origin_address: Address,
}
```

**Rules:**

- Signature MUST be over canonical SETTLE (including `preview_hash`)
- No execution parameters are allowed in SETTLE
- All execution context is resolved server-side from the committed preview

### 3.4 Backward Compatibility

These extensions are **strictly additive**:

- Older clients (v3.3) MAY omit new fields
- TBCs MUST default missing fields safely:
  - `force_wallet = false`
  - `settlement_contract = None`
  - `preview_hash = generate_on_demand()`

---

## 4. Routing Rules

Routing rules define how the TBC MUST process every message type. These rules are authoritative and MUST be followed by all conforming TBC implementations.

### 4.1 Routing Overview

Routing is determined strictly by the `type` field:

```
PING          → transport path
PONG          → (never accepted from client)
PREVIEW       → transport path
VALIDATE      → transport path

QUERY         → economic path
ACK           → outbound only
SETTLE        → economic path
WITHDRAW      → economic path
ERROR         → outbound only

INTENT        → agent path
AGENT_STATUS  → outbound only
CANCEL_INTENT → agent path
STATS         → outbound only
```

All incoming messages MUST match one of the above categories or be rejected with:

```json
{
  "type": "ERROR",
  "code": "P003_INVALID_TYPE",
  "message": "Unknown message type"
}
```

### 4.2 Transport Routing Path

Transport messages MUST:

- Not require signatures
- Not require nonce/timestamp (except PREVIEW/VALIDATE timestamp windows)
- Never modify economic state
- Never enter the executor pipeline

**Routing table:**

| Type | Handler |
|------|---------|
| PING | System health handler |
| PONG | REJECT (PONG only sent by TBC) |
| PREVIEW | Settlement simulation subsystem + **Preview Generator** |
| VALIDATE | Static signature/schema verifier |

Transport messages may be rate-limited by connection authentication.

### 4.3 Economic Routing Path

Economic messages require:

- Signature verification (Part 1, Section 8)
- Nonce validation (Part 1, Section 9.1)
- Timestamp freshness (Part 1, Section 9.2)
- ID deduplication (Part 1, Section 9.3)
- **Preview verification** (Section 1, this part) — NEW in v3.4
- Replay-protection checks
- Full schema validation
- Extracted origin identity

**Routing flow:**

```
┌─────────┐
│ Message │
└────┬────┘
     │
     ▼
Signature Verification
     │
     ▼
Replay Protection (nonce/timestamp/id)
     │
     ▼
Preview Verification (if SETTLE)  ← NEW in v3.4
     │
     ▼
Commitment/Order State Manager
     │
     ▼
Executor Interface (SETTLE/WITHDRAW)
     │
     ▼
Return ACK or ERROR
```

**Routing table:**

| Type | Handler |
|------|---------|
| QUERY | Commit intent → **preview generation** → state manager |
| ACK | Never accepted inbound |
| SETTLE | **Preview verification** → route to settlement queue/executor |
| WITHDRAW | Commitment withdrawal or claim |

### 4.4 Agent Routing Path

Agent messages MUST:

- Never alter settlement or economic state
- Never require signatures
- Never require nonce
- Never go through executor

**Routing table:**

| Type | Handler |
|------|---------|
| INTENT | Agent orchestration layer |
| CANCEL_INTENT | Remove instructions |
| AGENT_STATUS | Outbound only |
| STATS | Outbound only |

### 4.5 Rejected Message Conditions

A message MUST be rejected if:

| Condition | Error Code |
|-----------|------------|
| Invalid JSON | P001_INVALID_JSON |
| Missing required field | P002_MISSING_FIELD |
| Unknown message type | P003_INVALID_TYPE |
| Incorrect tgp_version | P005_VERSION_MISMATCH |
| Oversized message | P004_SIZE_EXCEEDED |
| Signature invalid | A100_INVALID_SIGNATURE |
| Address mismatch | A101_ADDRESS_MISMATCH |
| Nonce too low | R200_NONCE_TOO_LOW |
| Timestamp too old/new | R202 / R203 |
| Replay via UUID | R204_MESSAGE_ID_DUPLICATE |
| **Preview hash mismatch** | **PREVIEW_HASH_MISMATCH** (NEW) |
| **Preview expired** | **PREVIEW_EXPIRED** (NEW) |
| **Preview consumed** | **PREVIEW_ALREADY_CONSUMED** (NEW) |
| Settlement blocked | S304_CONTRACT_PAUSED |
| Missing commitments | S302_INSUFFICIENT_COMMITMENT |

Errors MUST be emitted using the ERROR message format.

---

## 5. Agent Messages

Agent messages allow:

- Wallet automation
- AI agents
- Browser-side orchestration
- Monitoring behavior

Agent messages never affect settlement outcomes.

### 5.1 INTENT (Agent Higher-Level Instruction)

AI agents may submit high-level settlements or monitoring instructions.

#### Example

```json
{
  "type": "INTENT",
  "agent_id": "cpw:my-agent",
  "instruction": "monitor_order",
  "order_id": "ORD-5001",
  "thresholds": {
    "max_gas_gwei": 2
  }
}
```

Agents can observe, but cannot sign economic messages. **ONLY the user's signature triggers economic change.**

### 5.2 AGENT_STATUS

TBC MAY emit agent status messages.

```json
{
  "type": "AGENT_STATUS",
  "agent_id": "cpw:my-agent",
  "status": "idle",
  "queued_intents": 3
}
```

### 5.3 CANCEL_INTENT

Agents may cancel internal agent-level instructions.

```json
{
  "type": "CANCEL_INTENT",
  "agent_id": "cpw:my-agent",
  "instruction_id": "abc123"
}
```

This does not affect economic commitments.

### 5.4 STATS

TBC MAY expose operational stats:

```json
{
  "type": "STATS",
  "uptime_ms": 12345678,
  "active_orders": 55,
  "executed_today": 322,
  "avg_gas_cost_wei": "21000000000000"
}
```

---

## 6. Complete Message Examples

This section provides complete, correct examples conforming to TGP-00 v3.4.

### 6.1 QUERY Example (Buyer COMMIT with Preview Request)

```json
{
  "type": "QUERY",
  "tgp_version": "3.4",
  "id": "uuid-111",
  "nonce": 7,
  "timestamp": 1736382520000,
  "origin_address": "0xBuyer123",

  "intent": {
    "verb": "COMMIT",
    "party": "BUYER",
    "mode": "DIRECT",
    "payload": {
      "order_id": "ORD-22",
      "amount_wei": "1000000000000000000",
      "asset": "NATIVE",
      "merchant_id": "acme-electronics",
      "metadata": {
        "merchant_name": "Acme Electronics",
        "invoice_ref": "INV-500-A"
      }
    }
  },

  "chain_id": 943,
  "force_wallet": false,
  "signature": "0xabc123..."
}
```

### 6.2 ACK Example (With Preview)

```json
{
  "type": "ACK",
  "tgp_version": "3.4",
  "ref_id": "uuid-111",
  "status": "COMMIT_RECORDED",
  "timestamp": 1736382522000,
  
  "preview_hash": "0x789def456abc123...",
  "gas_mode": "RELAY",
  "settlement_contract": "0x1234567890abcdef...",
  "estimated_total_cost_wei": "231000000000000",
  
  "order_state": {
    "order_id": "ORD-22",
    "buyer_committed": true,
    "seller_committed": false
  }
}
```

### 6.3 SETTLE Example (With Preview Hash)

```json
{
  "type": "SETTLE",
  "tgp_version": "3.4",
  "id": "uuid-999",
  "nonce": 92,
  "timestamp": 1736382601000,
  "origin_address": "0xBuyer123",
  
  "order_id": "ORD-22",
  "preview_hash": "0x789def456abc123...",
  
  "chain_id": 943,
  "signature": "0xddd000..."
}
```

### 6.4 WITHDRAW Example

```json
{
  "type": "WITHDRAW",
  "tgp_version": "3.4",
  "id": "uuid-112-998",
  "nonce": 93,
  "timestamp": 1736382609000,
  "origin_address": "0xSellerDEF",

  "order_id": "ORD-22",
  "chain_id": 943,
  "signature": "0xeee111..."
}
```

### 6.5 PREVIEW Request Example

```json
{
  "type": "PREVIEW",
  "envelope": {
    "order_id": "ORD-22",
    "buyer": "0xBuyer123",
    "seller": "0xSellerDEF",
    "amount_wei": "1000000000000000000",
    "chain_id": 943
  }
}
```

### 6.6 PREVIEW_RESULT Example

```json
{
  "type": "PREVIEW_RESULT",
  "valid": true,
  "missing_commits": [],
  "ttl_expired": false,
  "nonce_valid": true,

  "estimated_gas": "210000",
  "gas_price_gwei": "1.1",
  "estimated_cost_wei": "231000000000000",

  "network_fee_wei": "231000000000000",
  "protocol_fee_wei": "0",

  "estimated_settlement_time_ms": 14000,
  "queue_position": 1,
  "queue_depth": 8
}
```

### 6.7 VALIDATE Example

```json
{
  "type": "VALIDATE",
  "envelope": {
    "type": "SETTLE",
    "tgp_version": "3.4",
    "id": "uuid-777",
    "nonce": 91,
    "timestamp": 1736382567000,
    "origin_address": "0xBuyer123",
    "order_id": "ORD-22",
    "preview_hash": "0x789def456abc123...",
    "chain_id": 943
  },
  "signature": "0xccc789...",
  "check_nonce": true
}
```

### 6.8 ERROR Example (Preview Hash Mismatch)

```json
{
  "type": "ERROR",
  "code": "PREVIEW_HASH_MISMATCH",
  "message": "Provided preview_hash does not match stored preview",
  "ref_id": "uuid-999",
  "expected_hash": "0x789def456abc123...",
  "provided_hash": "0x111222333444555...",
  "order_id": "ORD-22",
  "retryable": false
}
```

---

## End of Part 2

**Continue to:**
- [Part 3: Implementation Guide & Security](./TGP-00_v3.4_Part3_Implementation.md) — Message size constraints, security considerations, migration path, error catalog, glossary

**See also:**
- [Part 1: Core Protocol & Transport](./TGP-00_v3.4_Part1_Core_Protocol.md) — WebSocket transport, authentication, canonical hashing, replay protection
