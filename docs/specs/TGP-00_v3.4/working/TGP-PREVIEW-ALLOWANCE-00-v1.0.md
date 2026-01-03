# TGP-PREVIEW-ALLOWANCE-00
## Preview-Phase Allowance Gating for Gas-Relayed Settlement

**Status:** Draft  
**Applies to:** TGP v3.4+  
**Layer:** Economic Control Plane (Layer 8)  
**Scope:** Buyer-side ERC-20 settlement using Gas Relay  
**Version:** 1.0  
**Date:** December 2025

---

## 1. Purpose

This specification defines how the TGP PREVIEW phase evaluates ERC-20 allowances to determine whether a payment can proceed via gas-relayed settlement, and how deficiencies are communicated without triggering execution or wallet side-effects.

**Goal:** Enable one-time approval followed by 1-click payments while preserving non-custodial control and minimizing user friction.

---

## 2. Design Principles

1. **No execution in PREVIEW** - Readiness checks only
2. **No mutation of chain state** - All queries are read-only
3. **No RPC dependence on the client** - Server can check independently
4. **Deterministic allowance evaluation** - Same inputs = same outputs
5. **Explicit readiness signaling** - Clear READY vs REQUIRES_APPROVAL states
6. **Single-approval amortization** - One approval enables multiple purchases
7. **Merchant-agnostic approvals** - Approval is to Gas Relay, not merchants

---

## 3. Definitions

| Term | Meaning |
|------|---------|
| **Gas Relay** | On-chain contract authorized to execute buyer deposits via `transferFrom` |
| **Settlement Contract** | Merchant-specific escrow contract that receives funds and enforces dual-commitment |
| **Buyer Delegate** | Ephemeral address authorized to sign TGP intents on behalf of buyer |
| **Allowance Target** | The address that must be approved to spend tokens (always Gas Relay) |
| **Required Allowance** | Minimum allowance needed to execute buyer deposit |
| **Preview Record** | Immutable snapshot created during PREVIEW containing allowance status |
| **Execution Phase** | Stage in settlement state machine (BUYER_COMMIT, SELLER_COMMIT, etc.) |

---

## 3.1 Scope and Execution Boundaries

### What Gas Relay Does:
- Executes `transferFrom(buyer_delegate, settlement_contract, amount)` on behalf of buyer
- Pays gas costs for the transaction
- Submits signed intent to blockchain
- Returns transaction receipt to TBC

### What Gas Relay Does NOT Do:
- ❌ Does NOT create dual-commitment automatically
- ❌ Does NOT commit on seller's behalf
- ❌ Does NOT release funds from escrow
- ❌ Does NOT bypass settlement contract validation logic

### State Machine Mapping:

```
TGP SETTLE → Executes BUYER_COMMIT only
             ↓
Settlement Contract State: BUYER_COMMITTED
             ↓
             [Seller commits separately via other flow]
             ↓
Settlement Contract State: BOTH_COMMITTED
             ↓
             [Seller claims per payment profile policy]
             ↓
Settlement Contract State: SELLER_CLAIMED
```

**Critical Invariant:** Gas Relay is a transport/executor for buyer deposits only, not a commitment orchestrator.

---

## 4. Allowance Target Resolution & Privacy Postures

### 4.1 Allowance Target (Normative)

During PREVIEW, the Allowance Target MUST be resolved as:

```
AllowanceTarget := GasRelay.address
```

**NOT:**
- Settlement contract address
- Merchant address
- Buyer's primary wallet address

**Rationale:** The Gas Relay is the entity executing `transferFrom`.

### 4.2 Privacy Postures

This specification defines three privacy postures for allowance checking:

#### **P1: TBC-Checked Allowance (Default)**

**Behavior:**
- TBC queries `allowance(buyer_delegate, GasRelay)` during PREVIEW
- Fast UX, minimal client complexity
- **Privacy cost:** TBC operator learns buyer delegate address

**Use when:**
- User trusts TBC operator with metadata
- UX speed is priority
- Default posture for Phase 1

#### **P2: Client-Checked Allowance (Optional)**

**Behavior:**
- CPE/CPW queries allowance locally via RPC
- Client includes `allowance_ready: true` in PREVIEW (non-authoritative)
- TBC re-checks only at SETTLE time
- **Privacy gain:** TBC doesn't learn address during preview unless SETTLE executes

**Use when:**
- User wants metadata privacy from TBC
- Client has reliable RPC access
- Acceptable UX tradeoff

#### **P3: ZK Allowance Proof (Future Work)**

**Behavior:**
- Prove `allowance >= required` without revealing address
- Requires on-chain state proof verification or trusted attestation
- **Privacy gain:** Full address privacy from TBC operator

**Status:** Not specified in Phase 1. Future extension.

**Notes:**
- P3 is distinct from Receipt Vault ZK proofs (post-transaction privacy)
- Allowance gating is pre-transaction readiness check
- P3 requires significant cryptographic infrastructure

### 4.3 Buyer Delegate Address Management

The allowance MUST be granted to a Buyer Delegate address where:

**Generation:**
- Derived from buyer's primary wallet (HD derivation or contract wallet)
- MAY be session-scoped or long-lived based on privacy preference
- MUST NOT be reused across chains (chain_id scoped)

**Privacy Properties:**
- On-chain activity NOT linkable to buyer identity without TBC cooperation
- Delegate rotation supported for enhanced privacy
- TBC operator MUST NOT log delegate-to-buyer mappings long-term

**Authorization:**
- Buyer signs delegation message once (off-chain signature)
- TBC validates delegation proof during PREVIEW
- Delegate can only create escrows (BUYER_COMMIT), not withdraw funds

**Revocation:**
- Buyer can revoke delegate at any time via TBC interface or direct call
- Revocation invalidates all pending intents using that delegate
- New delegate requires new approval + new delegation signature

### 4.4 Implementation Requirement

- Implementations MUST support **P1** (TBC-checked)
- Implementations MAY support **P2** (client-checked)
- Implementations SHOULD NOT implement **P3** until a formal extension spec is published

---

## 5. Required Allowance Calculation

### 5.1 Allowance Formula

```
RequiredAllowanceWei := 
    payment.amount_wei 
  + gas_relay_service_fee_wei
  + tgp_protocol_fee_wei
  + buffer_wei
```

**Component Definitions:**

| Component | Description | Example Value |
|-----------|-------------|---------------|
| `payment.amount_wei` | Base payment amount from intent | 100,000,000 wei (0.1 token) |
| `gas_relay_service_fee_wei` | Gas Relay operator fee (0.1% of amount, min 1000 wei) | 100,000 wei |
| `tgp_protocol_fee_wei` | TGP protocol fee from payment profile | 50,000 wei |
| `buffer_wei` | Safety margin for fee volatility (2% of subtotal) | 3,002 wei |
| **Total** | | **103,152,000 wei** |

### 5.2 Fee Calculation Rules

**Protocol fees MUST be deterministic at PREVIEW time:**

1. **Gas Relay Service Fee:**
   - Percentage: 0.1% of payment amount
   - Minimum: 1,000 wei (dust protection)
   - Maximum: 0.1 ETH equivalent (cap on large purchases)

2. **TGP Protocol Fee:**
   - Defined in payment profile
   - Fixed per merchant/product category
   - Disclosed in PREVIEW_ACK

3. **Buffer Strategy:**
   - 2% additional allowance for fee volatility
   - If actual fees exceed estimate: settlement fails
   - Buyer NOT charged excess fees (fail-closed design)

4. **Fee Disclosure:**
   - PREVIEW_ACK MUST itemize all fee components
   - CPE/CPW MUST display fees before approval
   - No hidden fees allowed

**Notes:**
- Gas costs MUST NOT be included (paid by Gas Relay)
- Fee calculation MAY round up for safety
- Estimation errors result in failed settlement, not user overcharge

---

## 5.3 Relay Operator Model

### 5.3.1 Operator Types

**O1: TBC-Operated Relay (Phase 1 Default)**
- Centralized infrastructure operated by TBC team
- Best UX, highest reliability
- **Trust model:** Operator can censor/rate-limit but cannot steal funds

**O2: Merchant-Operated Relay (Future Support)**
- Each merchant runs their own relay instance
- Better censorship resistance vs single operator
- Good for enterprise/B2B scenarios

**O3: Decentralized Relay Network (Out of Scope)**
- Marketplace of competing relays
- Requires relay selection, anti-abuse economics
- Separate product; not covered in this spec

### 5.3.2 Multi-Relay Capability

PREVIEW_ACK MUST include relay identification:

```json
{
  "gas_mode": "RELAY",
  "relay_operator": "tbc-relay-mainnet-1",
  "relay_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Fields:**
- `relay_address`: **Required** - On-chain relay contract address for verification
- `relay_operator`: **Optional** - Human-readable operator identifier for transparency

**Purpose:**
- `relay_address` enables client to verify correct relay contract
- `relay_operator` provides transparency about which entity operates the relay
- Neither field is for "support" - this is trust-minimized infrastructure

**Phase 1 Scope:** 
- Single relay operator (TBC team)
- `relay_operator` optional but recommended for transparency
- `relay_address` always required

**Future Multi-Relay:**
- Client selects relay based on `relay_operator` + reputation/performance
- `relay_address` verified against known relay registry
- No "support tickets" - code is law

---

## 6. PREVIEW Allowance Evaluation (Normative)

During PREVIEW, the TBC MUST:

### Step 1: Query ERC-20 Allowance

```solidity
uint256 allowance = ERC20(token).allowance(buyer_delegate, GasRelay);
```

**Privacy Posture Selection:**
- **P1:** TBC performs query directly
- **P2:** Client self-reports; TBC validates at SETTLE
- **P3:** Not implemented (future)

### Step 2: Compare Against Required Amount

```
if (allowance >= RequiredAllowanceWei) {
    status = "READY"
} else if (allowance > 0 && allowance < RequiredAllowanceWei) {
    status = "INSUFFICIENT"
} else {
    status = "REQUIRES_APPROVAL"
}
```

### Step 3: Classify Result

| Condition | Status | CPW/CPE Action |
|-----------|--------|----------------|
| `allowance >= required` | **READY** | Enable "Pay Now" button |
| `allowance < required` | **REQUIRES_APPROVAL** | Show "Approve to Pay" flow |
| `call fails / RPC error` | **UNAVAILABLE** | Show error, fallback to direct settlement |

### 6.1 State Machine Mapping to Settlement Contract

Gas Relay settlement maps to CoreProver/Settlement contract states as follows:

| TGP Phase | Settlement State | Description |
|-----------|------------------|-------------|
| **PREVIEW** | N/A | Readiness check only, no on-chain state |
| **SETTLE** | **BUYER_COMMITTED** | Buyer deposit posted via Gas Relay |
| *(out of scope)* | SELLER_COMMITTED | Seller counter-commits (separate flow) |
| *(out of scope)* | BOTH_COMMITTED | Dual-commitment gate unlocked |
| *(out of scope)* | SELLER_CLAIMED | Seller claims payment + receipt minted |

**Critical Invariants:**

1. **SETTLE = BUYER_COMMIT only**
   - TGP SETTLE message executes buyer deposit
   - Does NOT trigger seller commitment
   - Does NOT release funds

2. **Seller commitment is orthogonal**
   - Happens via separate TGP messages (future spec)
   - Or happens off-protocol (e.g., shipping proof, legal signature)
   - Gas Relay is NOT involved in seller flows

3. **Security preserved**
   - Settlement contract enforces dual-commitment
   - Gas Relay cannot bypass escrow logic
   - User authorization validated on-chain

### Nomenclature Clarification

**Avoid ambiguity:**
- ❌ "Settlement via Gas Relay" (implies finality)
- ✅ "Buyer deposit via Gas Relay" (accurate)

**In logs/UI:**
- Label as "Deposit" or "Buyer Commit", not generic "Settle"

**In protocol messages:**
- Message name remains `SETTLE` for backwards compatibility
- But `execution_phase: "BUYER_COMMIT"` MUST be included in PREVIEW_ACK

---

## 7. PREVIEW ACK Signaling

### 7.1 Message Format (Normative)

The PREVIEW ACK MUST include:

```json
{
  "gas_mode": "RELAY",
  "execution_phase": "BUYER_COMMIT",
  "execution_ready": false,
  "relay_operator": "tbc-relay-mainnet-1",
  "relay_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "allowance": {
    "target": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "required_wei": "103152000",
    "current_wei": "0",
    "status": "REQUIRES_APPROVAL",
    "check_method": "TBC_CHECKED"
  },
  "fees": {
    "payment_amount_wei": "100000000",
    "gas_relay_fee_wei": "100000",
    "protocol_fee_wei": "50000",
    "buffer_wei": "3002",
    "total_wei": "103152000"
  }
}
```

### 7.2 Field Definitions

**Top-Level Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gas_mode` | string | Yes | Always "RELAY" for gas-relayed settlement |
| `execution_phase` | string | Yes | Always "BUYER_COMMIT" in this spec |
| `execution_ready` | boolean | Yes | `true` if allowance sufficient, `false` otherwise |
| `relay_operator` | string | No | Optional human-readable operator identifier for transparency |
| `relay_address` | address | Yes | On-chain Gas Relay contract address for verification |

**Allowance Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | address | Yes | Address to approve (Gas Relay) |
| `token` | address | Yes | ERC-20 token contract address |
| `required_wei` | string | Yes | Minimum allowance needed (base units) |
| `current_wei` | string | Yes | Current allowance (may be 0) |
| `status` | enum | Yes | "READY" \| "REQUIRES_APPROVAL" \| "INSUFFICIENT" \| "UNAVAILABLE" |
| `check_method` | enum | Yes | "TBC_CHECKED" \| "CLIENT_CHECKED" \| "ZK_PROOF" |

**Fees Object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `payment_amount_wei` | string | Yes | Base payment amount |
| `gas_relay_fee_wei` | string | Yes | Gas Relay service fee |
| `protocol_fee_wei` | string | Yes | TGP protocol fee |
| `buffer_wei` | string | Yes | Safety buffer (2%) |
| `total_wei` | string | Yes | Sum of all components |

### 7.3 READY State Example

When allowance is sufficient:

```json
{
  "gas_mode": "RELAY",
  "execution_phase": "BUYER_COMMIT",
  "execution_ready": true,
  "relay_operator": "tbc-relay-mainnet-1",
  "relay_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "allowance": {
    "target": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "required_wei": "103152000",
    "current_wei": "500000000",
    "status": "READY",
    "check_method": "TBC_CHECKED"
  },
  "fees": {
    "payment_amount_wei": "100000000",
    "gas_relay_fee_wei": "100000",
    "protocol_fee_wei": "50000",
    "buffer_wei": "3002",
    "total_wei": "103152000"
  }
}
```

---

## 8. Client (CPE / CPW) Responsibilities

### 8.1 When Status is REQUIRES_APPROVAL

The client MUST:

1. **NOT attempt SETTLE** - Button should be disabled
2. **Surface approval action** - Show clear "Approve" button
3. **Display fee breakdown** - Itemize all fees from `fees` object
4. **Explain one-time setup** - Message: *"Approve once to enable 1-click payments"*
5. **Provide fallback** - Always offer direct settlement option

**Recommended UI Copy:**

```
┌─────────────────────────────────────────┐
│ ⚠️  Approval Required                   │
│                                         │
│ To enable instant payments without     │
│ gas fees, approve the Gas Relay to     │
│ spend USDC on your behalf.             │
│                                         │
│ Payment: 100.00 USDC                   │
│ Relay Fee: 0.10 USDC (0.1%)           │
│ Protocol Fee: 0.05 USDC                │
│ ────────────────────────────────────   │
│ Total: 100.15 USDC                     │
│                                         │
│ Relay: 0x742d...bEb (verify address)  │
│                                         │
│ [Approve Gas Relay]  [Pay Direct]     │
└─────────────────────────────────────────┘
```

**Critical:**
- Show relay_address for user verification
- Provide direct settlement fallback (no relay dependency)
- No "contact support" - users verify on-chain state themselves

### 8.2 Approval Transaction

The approval transaction MUST:

- Target `allowance.target` address (Gas Relay)
- Approve at least `allowance.required_wei`
- Use standard ERC-20 `approve(address spender, uint256 amount)`

**Recommended Approval Amounts:**

| Use Case | Amount | Rationale |
|----------|--------|-----------|
| **Single Purchase** | `required_wei` | Minimal trust, must approve per transaction |
| **Regular Customer** | `required_wei * 10` | ~10 purchases without re-approval |
| **Power User** | `MAX_UINT256` | Unlimited (full trust in TBC operator) |

**CPE/CPW SHOULD offer radio buttons:**

```
How much would you like to approve?

○ This purchase only (100.15 USDC)
● Next 10 purchases (~1,001.50 USDC)  ← Default
○ Unlimited (no future approvals needed)

[Approve & Continue]
```

### 8.3 After Approval

Client workflow:

1. **Wait for approval tx confirmation** (1-3 blocks)
2. **Re-trigger PREVIEW** with same intent
3. **Verify new status is READY**
4. **Enable "Pay Now" button**

**Error handling:**
- If approval fails: Show error, offer retry or direct settlement
- If approval succeeds but PREVIEW still shows INSUFFICIENT: Check for calculation mismatch, prompt user to approve higher amount

### 8.4 When Status is READY

The client MUST:

1. **Enable "Pay Now" button** - Make primary action available
2. **Remove approval prompts** - Clean UI
3. **Show estimated speed** - "Instant payment (no gas required)"

**Recommended UI Copy:**

```
┌─────────────────────────────────────────┐
│ ✅ Ready to Pay                         │
│                                         │
│ Payment: 100.00 USDC                   │
│ Fees: 0.15 USDC                        │
│ Total: 100.15 USDC                     │
│                                         │
│ ⚡ Instant • No gas fees                │
│                                         │
│ [Pay Now] ◄── Primary action            │
│                                         │
│ or [Pay with wallet] (requires gas)    │
└─────────────────────────────────────────┘
```

### 8.5 Post-SETTLE UI State

**Critical:** After SETTLE executes, client MUST NOT show "Payment complete" or "Settled".

**Correct Messaging:**

```
┌─────────────────────────────────────────┐
│ ✅ Deposit Confirmed                    │
│                                         │
│ Your payment has been deposited to      │
│ escrow. Waiting for seller to commit.  │
│                                         │
│ Order ID: #ABC123                       │
│ Status: Awaiting Seller                 │
│ Escrow: 0x8f3c...42a1                  │
│                                         │
│ You'll be notified when the seller     │
│ confirms your order.                    │
│                                         │
│ [View On-Chain]  [Track Order]         │
└─────────────────────────────────────────┘
```

**Wrong Messaging:**
- ❌ "Payment complete"
- ❌ "Transaction settled"
- ❌ "Funds transferred to merchant"
- ❌ "Contact support if issues" (code is law, verify on-chain)

**Right Messaging:**
- ✅ Show escrow contract address for verification
- ✅ Link to block explorer for transparency
- ✅ Enable user to verify dual-commitment state on-chain

---

## 9. SETTLE Gating Rule

### 9.1 Pre-Execution Validation

TBC MUST reject SETTLE if any of:

1. **`preview.allowance.status != "READY"`**
   → Error: `S403_ALLOWANCE_NOT_READY`

2. **`preview.execution_phase != "BUYER_COMMIT"`**
   → Error: `S400_INVALID_EXECUTION_PHASE`

3. **Gas Relay unavailable or paused**
   → Error: `S503_GAS_RELAY_UNAVAILABLE`

4. **Buyer delegate authorization invalid/expired**
   → Error: `S401_DELEGATE_UNAUTHORIZED`

5. **Intent expired** (timestamp outside validity window)
   → Error: `S408_INTENT_EXPIRED`

### 9.2 Allowance State Reconciliation

**During SETTLE execution, TBC MUST:**

**Step 1: Re-Query Current Allowance**

```solidity
uint256 current_allowance = ERC20(token).allowance(buyer_delegate, GasRelay);
```

**Step 2: Apply State Transition Rules**

| PREVIEW Status | Current Allowance | Action | Error Code |
|----------------|-------------------|--------|------------|
| READY | `≥ required` | ✅ EXECUTE | N/A |
| READY | `< required` | ❌ REJECT | `S403_ALLOWANCE_REVOKED` |
| REQUIRES_APPROVAL | `≥ required` | ✅ EXECUTE | N/A (user approved externally) |
| REQUIRES_APPROVAL | `< required` | ❌ REJECT | `S403_ALLOWANCE_INSUFFICIENT` |

**Step 3: Handle Edge Cases**

**Scenario A: Allowance Decreased Between PREVIEW and SETTLE**
```
PREVIEW: allowance = 500,000,000 (READY)
[User revokes to 0 before SETTLE]
SETTLE: allowance = 0
Result: Reject with S403_ALLOWANCE_REVOKED
Recovery: Client prompts re-approval
```

**Scenario B: Allowance Increased Between PREVIEW and SETTLE**
```
PREVIEW: allowance = 50,000,000 (INSUFFICIENT)
[User approves 200,000,000 externally]
SETTLE: allowance = 200,000,000
Result: Execute successfully (honor new state)
```

**Scenario C: Partial Depletion**
```
PREVIEW: allowance = 200,000,000 (READY)
[Another transaction consumes 150,000,000]
SETTLE: allowance = 50,000,000 (< required 103,152,000)
Result: Reject with S403_ALLOWANCE_INSUFFICIENT
```

### 9.3 Intent Validity Window

- Intent remains valid for **60 seconds** after PREVIEW
- Allowance changes within window: Honor new state
- Expired intent: Client MUST re-trigger PREVIEW

### 9.4 Post-Execution State

After successful SETTLE:

**Settlement Contract:**
- State: `BUYER_COMMITTED`
- Funds: Deposited in escrow
- Awaiting: Seller commitment

**Order/Receipt State:**
- Status: "Awaiting Seller Commitment"
- Notification: Buyer informed of deposit confirmation
- Next Step: Seller commit flow (out of scope for this spec)

---

## 10. Replay & Safety Guarantees

**Non-Binding PREVIEW:**
- PREVIEW allowance results are informational only
- No commitment is made during PREVIEW
- Client may cache for UX but MUST NOT assume validity at SETTLE time

**SETTLE Re-Validation:**
- SETTLE MUST re-check allowance (Section 9.2)
- Prevents race conditions and ensures consistency
- Gas Relay execution MUST fail closed on insufficient allowance

**No Implicit Approvals:**
- Gas Relay cannot request approval on behalf of user
- All approvals MUST be explicit user actions via wallet
- No meta-transactions or delegated approvals in Phase 1

**Idempotency:**
- SETTLE with same intent ID is idempotent
- Duplicate SETTLE attempts return original transaction receipt
- No double-spending via replay

---

## 11. Security Considerations (Expanded)

### 11.1 Trust Boundaries

**What User Trusts:**
- TBC operator to execute relays faithfully (liveness)
- TBC operator NOT to censor transactions arbitrarily
- Settlement contract to enforce escrow logic (safety)
- Buyer delegate derivation to preserve privacy

**What User Does NOT Trust:**
- Gas Relay cannot drain more than approved allowance (capped by approval)
- Gas Relay cannot bypass settlement contract validation
- Gas Relay cannot commit on seller's behalf (enforcement via contract)
- Gas Relay cannot release funds early (dual-commitment enforced)

### 11.2 Allowance Scope

**Properties:**
- Allowance is limited to Gas Relay address only
- Revocable by user at any time via `approve(relay, 0)`
- No merchant-specific sub-delegation in Phase 1
- No automatic refills or rolling approvals
- Time-bound approvals: Future extension (requires ERC-20 changes)

**Attack Surface:**
- Compromised Gas Relay: Can drain up to approved amount
- Mitigation: Conservative approval amounts, regular audits
- Emergency response: User revokes allowance immediately

### 11.3 Delegate Security

**Buyer Delegate Properties:**
- Derived from buyer's primary wallet (off-chain signature)
- Can only initiate BUYER_COMMIT (not withdraw or claim)
- Ephemeral and rotatable for privacy
- Compromise impact: Attacker can create spam escrows, not steal funds

**Key Insight:** Delegate compromise is inconvenient (spam escrows) but NOT catastrophic (funds safe in primary wallet).

**Revocation Flow:**
1. User detects suspicious activity
2. Revokes delegate via TBC interface or direct contract call
3. All pending intents with that delegate invalidated
4. Generates new delegate for future transactions
5. Must re-approve Gas Relay with new delegate

### 11.4 Relay Operator Risks

**Centralized Relay (O1) Risks:**

| Risk | Impact | User Action |
|------|--------|-------------|
| **Censorship** | Operator refuses specific transactions | Switch to direct settlement (DSFM) |
| **Rate Limiting** | Operator throttles specific users | Use direct settlement |
| **Downtime** | Relay unavailable during maintenance | Automatic fallback to direct settlement |
| **Key Compromise** | Attacker gains relay signing key | Cannot steal more than approved; revoke allowance immediately |

**Mitigation Strategies:**
- Direct Settlement Fallback Mode (DSFM) always available
- User warned if Gas Relay unavailable
- No lock-in: User can always transact directly
- Multi-sig on Gas Relay admin functions
- Regular security audits
- **No support dependency**: Users verify on-chain state themselves

**Trust Model:**
- User trusts relay for liveness (execution), NOT for safety (escrow enforces)
- Relay cannot steal funds (allowance-limited)
- Relay cannot bypass dual-commitment (contract enforces)
- User can exit to direct settlement anytime (no dependency)

### 11.5 Privacy Considerations

**Metadata Leakage (P1 TBC-Checked):**
- TBC operator learns buyer delegate address during PREVIEW
- Not visible to merchant or on-chain observers without TBC cooperation
- Linkable across merchants if delegate reused (addressable via rotation)

**Mitigations:**
- **P2 (client-checked)** reduces TBC metadata exposure
- **Delegate rotation** breaks cross-merchant linkability
- **P3 (ZK proofs)** eliminates metadata leakage entirely (future)

**On-Chain Privacy:**
- Merchant sees delegate address, not buyer's primary wallet
- Cross-transaction linkage requires TBC cooperation
- Receipt Vault maintains buyer anonymity via ZK proofs post-settlement

### 11.6 Known Non-Risks

**Gas Relay does NOT:**
- ❌ Control escrow release logic (contract enforces dual-commitment)
- ❌ See buyer's primary wallet address (only delegate)
- ❌ Link purchases across merchants automatically (requires delegate reuse)
- ❌ Facilitate MEV attacks (buyer deposit is not arbitrageable)
- ❌ Access Receipt Vault contents (ZK-gated)

---

## 12. Error Taxonomy

### 12.1 PREVIEW Phase Errors

| Code | Name | Cause | Client Action |
|------|------|-------|---------------|
| `P400_INVALID_TOKEN` | Invalid Token | Token not ERC-20 compliant | Show error, fallback to direct |
| `P404_TOKEN_NOT_FOUND` | Token Not Found | Token address doesn't exist | Show error, check address |
| `P503_RPC_UNAVAILABLE` | RPC Error | Cannot query allowance | Retry or fallback to P2 |
| `P403_DELEGATE_INVALID` | Invalid Delegate | Delegate signature invalid | Re-authenticate buyer |

### 12.2 SETTLE Phase Errors

| Code | Name | Cause | Client Action |
|------|------|-------|---------------|
| `S403_ALLOWANCE_NOT_READY` | Allowance Not Ready | Status != READY at validation | Re-check allowance state |
| `S403_ALLOWANCE_INSUFFICIENT` | Insufficient Allowance | Allowance decreased since PREVIEW | Prompt re-approval |
| `S403_ALLOWANCE_REVOKED` | Allowance Revoked | User revoked between PREVIEW/SETTLE | Prompt re-approval |
| `S400_INVALID_EXECUTION_PHASE` | Invalid Phase | `execution_phase != BUYER_COMMIT` | Client implementation error |
| `S401_DELEGATE_UNAUTHORIZED` | Unauthorized Delegate | Delegate auth expired/invalid | Re-authenticate buyer |
| `S408_INTENT_EXPIRED` | Intent Expired | >60s since PREVIEW | Re-trigger PREVIEW |
| `S503_GAS_RELAY_UNAVAILABLE` | Relay Unavailable | Gas Relay down/paused | Fallback to direct settlement |
| `S500_EXECUTION_FAILED` | Execution Failed | On-chain tx reverted | Check on-chain state, retry or use direct |

**Error Handling Philosophy:**
- All errors include on-chain transaction hash (if submitted)
- Users verify state via block explorer
- No "support tickets" - trust-minimized = self-sovereign verification
- Fallback to direct settlement always available

---

## 13. Multi-Chain Considerations

### 13.1 Gas Relay Deployment

**Deterministic Addressing:**
- Gas Relay deployed via CREATE2 for same address across chains
- Constructor includes `chain_id` to prevent cross-chain replay
- Same bytecode, different initialization

**Supported Chains (Phase 1):**
- PulseChain Testnet v4 (primary)
- Base (secondary)
- Ethereum Mainnet (future)

### 13.2 Approval Scoping

**Chain-Specific Allowances:**
- Allowance is chain-specific (separate ERC-20 state per chain)
- CPE/CPW MUST request approval on correct chain
- PREVIEW_ACK MUST include `chain_id` field

**Chain Selection Flow:**
1. Merchant specifies preferred chain in payment profile
2. PREVIEW_ACK includes `chain_id` and `relay_address` for that chain
3. CPE/CPW prompts user to switch network if needed
4. Approval transaction submitted on correct chain

### 13.3 Cross-Chain Limitations

**Not Supported in Phase 1:**
- Cross-chain bridging of allowances
- Multi-chain atomic settlement
- Cross-chain allowance aggregation

**Future Extensions:**
- Unified allowance pools via L1/L2 bridges
- Multi-chain delegate coordination
- Cross-chain liquidity aggregation

---

## 14. UX Guidance (Non-Normative)

### 14.1 Recommended Copy

**First-Time Approval:**
```
🔐 Enable 1-Click Payments

Approve the Gas Relay once to enable instant,
gas-free payments. You remain in full control
and can revoke access anytime.

[Approve & Continue]  [Learn More]
```

**Status Icons:**
- 🟢 **Ready** - "You're all set! Click Pay Now"
- 🟡 **Approval Required** - "One-time setup needed"
- 🔴 **Unavailable** - "Gas Relay down, use direct payment"

**Fee Disclosure:**
```
Payment Details
├─ Item total: 100.00 USDC
├─ Relay fee (0.1%): 0.10 USDC
├─ Protocol fee: 0.05 USDC
└─ Total: 100.15 USDC

💡 No gas fees with Gas Relay
```

### 14.2 Approval Amount Selection

**Offer Clear Options:**

```
How much access would you like to grant?

○ This purchase only (minimal trust)
  Approve: 100.15 USDC

● Next ~10 purchases (recommended)
  Approve: 1,001.50 USDC

○ Unlimited (maximum convenience)
  Approve: Unlimited

ℹ️ You can revoke access anytime in Settings
```

### 14.3 Post-Settlement Messaging

**After BUYER_COMMIT (SETTLE) succeeds:**

```
✅ Deposit Confirmed

Your payment is now in escrow. The seller
will be notified to confirm your order.

Order: #ABC123
Escrow: 0x8f3c...42a1
Status: Awaiting Seller Confirmation

[View on Explorer]  [Track Order]
```

**Key Elements:**
- ✅ Show escrow contract address (user verification)
- ✅ Link to block explorer (transparency)
- ✅ Clear next step (seller must commit)
- ❌ No "contact support" (self-sovereign system)

**Avoid:**
- ❌ "Payment complete" (implies finality)
- ❌ "Funds transferred" (misleading)
- ❌ "Transaction settled" (ambiguous)
- ❌ "Need help? Contact support" (trust-minimized = no support)

---

## 15. Future Extensions

**Identified for Future Specs:**

1. **Permit2 Support** - Gasless approvals via EIP-2612
2. **Allowance Caps** - Time-bound or amount-limited approvals
3. **Multi-Token Batching** - Single approval for multiple tokens
4. **ERC-4337 Compatibility** - Account abstraction integration
5. **Dynamic Fee Adjustment** - Real-time fee optimization
6. **Cross-Chain Coordination** - Unified multi-chain allowances
7. **P3 Implementation** - ZK allowance proofs for full privacy

---

## 16. Conformance Tests

### 16.1 PREVIEW Phase Tests

```typescript
// Test 1: Insufficient Allowance
async function test_preview_requires_approval() {
  const preview = await createPreview({ amount: 100_000_000 });
  const allowance = await queryAllowance(); // Returns 0
  
  assert.equal(preview.allowance.status, "REQUIRES_APPROVAL");
  assert.equal(preview.execution_ready, false);
  assert.equal(preview.allowance.required_wei, "103152000");
  assert.equal(preview.allowance.current_wei, "0");
}

// Test 2: Sufficient Allowance
async function test_preview_ready() {
  await approveGasRelay(500_000_000); // Approve plenty
  const preview = await createPreview({ amount: 100_000_000 });
  
  assert.equal(preview.allowance.status, "READY");
  assert.equal(preview.execution_ready, true);
  assert.isTrue(preview.allowance.current_wei >= preview.allowance.required_wei);
}

// Test 3: Fee Calculation Accuracy
async function test_fee_breakdown() {
  const preview = await createPreview({ amount: 100_000_000 });
  
  assert.equal(preview.fees.payment_amount_wei, "100000000");
  assert.equal(preview.fees.gas_relay_fee_wei, "100000"); // 0.1%
  assert.equal(preview.fees.protocol_fee_wei, "50000");
  assert.equal(preview.fees.buffer_wei, "3002"); // 2% of subtotal
  
  const expected_total = 100_000_000 + 100_000 + 50_000 + 3_002;
  assert.equal(preview.fees.total_wei, expected_total.toString());
}
```

### 16.2 SETTLE Phase Tests

```typescript
// Test 4: Allowance Revoked Between PREVIEW and SETTLE
async function test_settle_allowance_revoked() {
  await approveGasRelay(500_000_000);
  const preview = await createPreview({ amount: 100_000_000 });
  assert.equal(preview.allowance.status, "READY");
  
  // User revokes allowance
  await revokeGasRelay();
  
  // SETTLE should fail
  const result = await executeSettle(preview.intent_id);
  assert.equal(result.error_code, "S403_ALLOWANCE_REVOKED");
}

// Test 5: External Approval Between PREVIEW and SETTLE
async function test_settle_external_approval() {
  const preview = await createPreview({ amount: 100_000_000 });
  assert.equal(preview.allowance.status, "REQUIRES_APPROVAL");
  
  // User approves externally (not via CPE)
  await approveGasRelay(200_000_000);
  
  // SETTLE should succeed
  const result = await executeSettle(preview.intent_id);
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.settlement_state, "BUYER_COMMITTED");
}

// Test 6: Partial Allowance Depletion
async function test_settle_partial_depletion() {
  await approveGasRelay(200_000_000);
  
  const preview1 = await createPreview({ amount: 100_000_000 });
  await executeSettle(preview1.intent_id); // Consumes ~103M
  
  const preview2 = await createPreview({ amount: 100_000_000 });
  // Remaining allowance < required
  const result = await executeSettle(preview2.intent_id);
  assert.equal(result.error_code, "S403_ALLOWANCE_INSUFFICIENT");
}
```

### 16.3 Security Tests

```typescript
// Test 7: Gas Relay Cannot Bypass Escrow
async function test_gas_relay_cannot_bypass_escrow() {
  await approveGasRelay(500_000_000);
  
  const tx = await executeSettle(intent_id);
  const escrow = await getEscrowState(tx.escrow_id);
  
  // Funds must be in escrow, not released
  assert.equal(escrow.state, "BUYER_COMMITTED");
  assert.equal(escrow.buyer_amount, "100000000");
  assert.equal(escrow.seller_amount, "0"); // Seller hasn't committed
  
  // Seller cannot claim yet
  await assert.rejects(
    sellerClaimPayment(tx.escrow_id),
    /DUAL_COMMITMENT_NOT_MET/
  );
}

// Test 8: Delegate Cannot Withdraw
async function test_delegate_cannot_withdraw() {
  await approveGasRelay(500_000_000);
  const tx = await executeSettle(intent_id);
  
  // Delegate tries to withdraw from escrow
  await assert.rejects(
    delegateWithdraw(tx.escrow_id, buyer_delegate),
    /UNAUTHORIZED/
  );
  
  // Only primary wallet can withdraw (in timeout scenarios)
  const withdrawal = await primaryWalletWithdraw(tx.escrow_id, buyer_wallet);
  assert.equal(withdrawal.status, "SUCCESS");
}
```

---

## 17. Implementation Dependencies

### 17.1 Required Components

**Before Implementation:**

- [ ] Gas Relay contract deployed on target chains
- [ ] Gas Relay contract audited and verified
- [ ] TBC allowance query module implemented
- [ ] CPE approval UI flow designed and built
- [ ] CPW approval flow integrated
- [ ] Error handling in SETTLE endpoint
- [ ] Fee estimation service operational
- [ ] Allowance monitoring worker (for alerting)
- [ ] Delegate derivation logic implemented
- [ ] Delegate revocation mechanism tested

### 17.2 Integration Points

**TGP Protocol Updates:**

- [ ] TGP PREVIEW message schema update (add allowance fields)
- [ ] TGP PREVIEW_ACK schema update (add execution_phase, relay_operator, fees)
- [ ] TGP SETTLE error codes expanded (S403_*, S401_*, etc.)
- [ ] TxIP-00 transport layer supports new message sizes

**CoreProver Integration:**

- [ ] Settlement contract supports Gas Relay as authorized executor
- [ ] Settlement contract validates delegate authorization
- [ ] BUYER_COMMITTED state correctly set after Gas Relay deposit
- [ ] Dual-commitment logic unaffected by Gas Relay usage

**Privacy Layer:**

- [ ] Receipt Vault ZK proofs compatible with delegate-based deposits
- [ ] Buyer primary wallet linked to delegate off-chain only
- [ ] TBC operator access logs audited for compliance

### 17.3 Testing Requirements

**Unit Tests:**
- [ ] Allowance calculation accuracy
- [ ] Fee breakdown correctness
- [ ] State transition logic
- [ ] Error code coverage

**Integration Tests:**
- [ ] End-to-end PREVIEW → Approve → SETTLE flow
- [ ] Cross-component message passing
- [ ] Multi-chain deployment verification
- [ ] Privacy posture switching (P1 ↔ P2)

**Security Tests:**
- [ ] Gas Relay cannot bypass escrow
- [ ] Delegate cannot withdraw funds
- [ ] Allowance revocation respected
- [ ] Replay attack prevention

**Performance Tests:**
- [ ] PREVIEW latency < 500ms
- [ ] SETTLE execution < 5s (including confirmation)
- [ ] Gas Relay throughput ≥ 100 tx/min
- [ ] RPC failure handling (graceful degradation)

---

## 18. Why This Works

This specification achieves the following design goals:

### ✅ Preserves Intent → Execution Separation
- PREVIEW is read-only evaluation
- SETTLE performs actual execution
- Clear gates between phases

### ✅ Enables Amazon-Style 1-Click UX
- One-time approval
- No wallet popups per transaction
- No gas required from buyer
- Instant settlement feedback

### ✅ Keeps Custody with User
- User retains full control via revocable allowances
- Delegate cannot withdraw, only deposit
- Primary wallet can always override delegate

### ✅ Avoids Protocol Sprawl
- Clean layering: economic control (L8) → TGP (L7) → TBC (L6)
- No new message types (extends existing PREVIEW/SETTLE)
- Minimal wire format changes

### ✅ Scales Across Chains
- Deterministic Gas Relay addresses
- Chain-specific allowances (no cross-chain complexity)
- Multi-chain support without protocol changes

### ✅ Maintains Privacy Properties
- Delegate shields buyer identity on-chain
- TBC operator metadata minimal (P1) or eliminable (P2/P3)
- Receipt Vault ZK proofs unaffected

---

## 19. Summary In One Line

**PREVIEW determines readiness via allowance checks; SETTLE performs buyer deposit execution.**

---

## Appendix A: Message Flow Diagrams

### A.1 Happy Path (PREVIEW → Approve → SETTLE)

```
┌─────────┐         ┌─────────┐         ┌──────────┐         ┌───────────┐
│   CPW   │         │   TBC   │         │  Chain   │         │ Merchant  │
└────┬────┘         └────┬────┘         └────┬─────┘         └─────┬─────┘
     │                   │                   │                     │
     │ PREVIEW           │                   │                     │
     ├──────────────────>│                   │                     │
     │                   │ Query allowance   │                     │
     │                   ├──────────────────>│                     │
     │                   │ allowance = 0     │                     │
     │                   │<──────────────────┤                     │
     │ PREVIEW_ACK       │                   │                     │
     │ REQUIRES_APPROVAL │                   │                     │
     │<──────────────────┤                   │                     │
     │                   │                   │                     │
     │ [User clicks "Approve"]              │                     │
     │                   │                   │                     │
     │ approve(GasRelay, 500M)              │                     │
     ├─────────────────────────────────────>│                     │
     │                   │                   │                     │
     │ Approval confirmed│                   │                     │
     │<──────────────────────────────────────┤                     │
     │                   │                   │                     │
     │ PREVIEW (retry)   │                   │                     │
     ├──────────────────>│                   │                     │
     │                   │ Query allowance   │                     │
     │                   ├──────────────────>│                     │
     │                   │ allowance = 500M  │                     │
     │                   │<──────────────────┤                     │
     │ PREVIEW_ACK       │                   │                     │
     │ READY             │                   │                     │
     │<──────────────────┤                   │                     │
     │                   │                   │                     │
     │ [User clicks "Pay Now"]              │                     │
     │                   │                   │                     │
     │ SETTLE            │                   │                     │
     ├──────────────────>│                   │                     │
     │                   │ Re-check allowance│                     │
     │                   ├──────────────────>│                     │
     │                   │ allowance ≥ req   │                     │
     │                   │<──────────────────┤                     │
     │                   │                   │                     │
     │                   │ transferFrom(delegate, escrow, amount) │
     │                   ├──────────────────>│                     │
     │                   │                   │                     │
     │                   │ SUCCESS           │                     │
     │                   │ BUYER_COMMITTED   │                     │
     │                   │<──────────────────┤                     │
     │                   │                   │                     │
     │ SETTLE_ACK        │                   │ Notify: Buyer      │
     │ execution_phase:  │                   │ deposited          │
     │ BUYER_COMMIT      │                   ├───────────────────>│
     │<──────────────────┤                   │                     │
     │                   │                   │                     │
     │ [Show "Deposit Confirmed,            │                     │
     │  Awaiting Seller"]│                   │                     │
     │                   │                   │                     │
```

### A.2 Allowance Revoked (Error Path)

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│   CPW   │         │   TBC   │         │  Chain   │
└────┬────┘         └────┬────┘         └────┬─────┘
     │                   │                   │
     │ PREVIEW           │                   │
     ├──────────────────>│                   │
     │                   │ Query allowance   │
     │                   ├──────────────────>│
     │                   │ allowance = 500M  │
     │                   │<──────────────────┤
     │ PREVIEW_ACK READY │                   │
     │<──────────────────┤                   │
     │                   │                   │
     │ [User revokes allowance externally]  │
     │                   │                   │
     │ approve(GasRelay, 0)                 │
     ├─────────────────────────────────────>│
     │                   │                   │
     │ SETTLE            │                   │
     ├──────────────────>│                   │
     │                   │ Re-check allowance│
     │                   ├──────────────────>│
     │                   │ allowance = 0     │
     │                   │<──────────────────┤
     │                   │                   │
     │ SETTLE_ERROR      │                   │
     │ S403_ALLOWANCE_   │                   │
     │ REVOKED           │                   │
     │<──────────────────┤                   │
     │                   │                   │
     │ [Show "Allowance revoked,            │
     │  please re-approve"]                 │
     │                   │                   │
```

---

## Appendix B: Example Implementations

### B.1 CPW Approval Flow (TypeScript)

```typescript
// CPW: Chrome extension approval flow
async function handleApprovalRequired(previewAck: PreviewAck) {
  const { allowance, fees } = previewAck;
  
  // Show approval modal
  const approvalAmount = await showApprovalModal({
    required: BigInt(allowance.required_wei),
    token: allowance.token,
    feeBreakdown: fees,
    options: [
      { label: 'This purchase only', amount: BigInt(allowance.required_wei) },
      { label: 'Next ~10 purchases', amount: BigInt(allowance.required_wei) * 10n },
      { label: 'Unlimited', amount: MAX_UINT256 },
    ],
  });
  
  if (!approvalAmount) {
    // User cancelled
    return { status: 'cancelled' };
  }
  
  // Request approval via wallet
  const tx = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: buyerDelegate,
      to: allowance.token,
      data: encodeApprove(allowance.target, approvalAmount),
    }],
  });
  
  // Wait for confirmation
  await waitForTransaction(tx);
  
  // Re-trigger PREVIEW
  const newPreview = await triggerPreview(originalIntent);
  
  if (newPreview.allowance.status === 'READY') {
    return { status: 'approved', preview: newPreview };
  } else {
    throw new Error('Approval succeeded but status not READY');
  }
}
```

### B.2 TBC Allowance Check (Rust)

```rust
// TBC: P1 allowance checking during PREVIEW
use ethers::prelude::*;

async fn check_allowance_p1(
    provider: &Provider<Http>,
    token: Address,
    owner: Address,  // buyer_delegate
    spender: Address, // gas_relay
    required: U256,
) -> Result<AllowanceStatus> {
    // Query ERC-20 allowance
    let allowance = query_erc20_allowance(provider, token, owner, spender).await?;
    
    // Classify status
    let status = if allowance >= required {
        AllowanceStatus::Ready {
            current: allowance,
            required,
        }
    } else if allowance > U256::zero() {
        AllowanceStatus::Insufficient {
            current: allowance,
            required,
            shortfall: required - allowance,
        }
    } else {
        AllowanceStatus::RequiresApproval {
            required,
        }
    };
    
    Ok(status)
}

async fn query_erc20_allowance(
    provider: &Provider<Http>,
    token: Address,
    owner: Address,
    spender: Address,
) -> Result<U256> {
    let contract = ERC20::new(token, Arc::new(provider.clone()));
    let allowance = contract.allowance(owner, spender).call().await?;
    Ok(allowance)
}
```

### B.3 CPE Status Display (React)

```tsx
// CPE: Merchant portal payment status display
function PaymentStatus({ previewAck }: { previewAck: PreviewAck }) {
  const { allowance, execution_ready, fees } = previewAck;
  
  if (allowance.status === 'READY' && execution_ready) {
    return (
      <div className="payment-ready">
        <div className="status-badge success">
          <CheckIcon /> Ready to Pay
        </div>
        <div className="payment-details">
          <div className="line-item">
            <span>Payment</span>
            <span>{formatWei(fees.payment_amount_wei)} USDC</span>
          </div>
          <div className="line-item">
            <span>Relay Fee (0.1%)</span>
            <span>{formatWei(fees.gas_relay_fee_wei)} USDC</span>
          </div>
          <div className="line-item">
            <span>Protocol Fee</span>
            <span>{formatWei(fees.protocol_fee_wei)} USDC</span>
          </div>
          <div className="line-item total">
            <span>Total</span>
            <span>{formatWei(fees.total_wei)} USDC</span>
          </div>
        </div>
        <button className="primary" onClick={handlePayNow}>
          Pay Now ⚡ (No gas required)
        </button>
      </div>
    );
  }
  
  if (allowance.status === 'REQUIRES_APPROVAL') {
    return (
      <div className="payment-approval-required">
        <div className="status-badge warning">
          <AlertIcon /> Approval Required
        </div>
        <p>
          To enable instant, gas-free payments, approve the Gas Relay
          to spend USDC on your behalf. This is a one-time setup.
        </p>
        <div className="approval-options">
          <label>
            <input type="radio" name="amount" value="single" />
            This purchase only ({formatWei(allowance.required_wei)} USDC)
          </label>
          <label>
            <input type="radio" name="amount" value="multiple" defaultChecked />
            Next ~10 purchases ({formatWei(BigInt(allowance.required_wei) * 10n)} USDC)
          </label>
          <label>
            <input type="radio" name="amount" value="unlimited" />
            Unlimited (maximum convenience)
          </label>
        </div>
        <button className="primary" onClick={handleApprove}>
          Approve & Continue
        </button>
        <button className="secondary" onClick={handleDirectPayment}>
          Pay with Wallet (requires gas)
        </button>
      </div>
    );
  }
  
  return <div className="payment-unavailable">Gas Relay unavailable</div>;
}
```

---

**END OF SPECIFICATION**

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2025 | TBC Team | Initial release with P1/P2/P3 model, O1 relay support, full message specs, trust-minimized philosophy |

**Next Review:** Before Phase 2 implementation (P2 client-checked, O2 merchant-operated)
