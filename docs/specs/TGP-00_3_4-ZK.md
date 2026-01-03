# 📋 Transaction Gateway Protocol 3.4-ZK Extension Specification

**Status:** Stable Extension  
**Version:** 3.4-ZK  
**Base Protocol:** TGP 3.4  
**Compatibility:** Fully backward compatible  
**Adoption:** Optional (buyer opt-in)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Principles](#2-design-principles)
3. [Protocol Extension Overview](#3-protocol-extension-overview)
4. [SETTLE Message Extension](#4-settle-message-extension)
5. [Processing Rules (Normative)](#5-processing-rules-normative)
6. [Zero-Knowledge Proof Semantics](#6-zero-knowledge-proof-semantics)
7. [ACK Message Extension (Optional)](#7-ack-message-extension-optional)
8. [Security Properties](#8-security-properties)
9. [Backward Compatibility](#9-backward-compatibility)
10. [Implementation Guidance](#10-implementation-guidance)
11. [Gas Cost Considerations](#11-gas-cost-considerations)
12. [Error Codes](#12-error-codes)
13. [Examples](#13-examples)
14. [References](#14-references)

---

## 1. Introduction

### 1.1 Purpose

Transaction Gateway Protocol (TGP) 3.4-ZK is an **optional extension** to TGP 3.4 that enables cryptographic verification of buyer intent through zero-knowledge proofs. This extension provides enhanced privacy and security guarantees without breaking existing implementations.

### 1.2 Motivation

TGP 3.4 relies on cryptographic signatures and smart contract enforcement for transaction security. While robust, this approach reveals transaction details on-chain and trusts the wallet implementation to accurately represent buyer intent.

The 3.4-ZK extension addresses these limitations by:

- **Privacy Enhancement:** Proving buyer intent without revealing wallet addresses or transaction parameters
- **Cryptographic Enforcement:** Making settlement mathematically gated on proof validity
- **Trust Minimization:** Eliminating reliance on wallet software honesty
- **Progressive Adoption:** Allowing opt-in deployment without forcing upgrades

### 1.3 Non-Goals

This extension explicitly does **NOT**:

- Create a separate protocol version or flow
- Deprecate or replace standard TGP 3.4
- Force additional costs on all users
- Introduce protocol negotiation or version branching
- Require changes to existing implementations

---

## 2. Design Principles

The TGP 3.4-ZK extension adheres to the following principles:

### 2.1 Additive-Only Semantics

All changes are **purely additive**. No existing TGP 3.4 fields change meaning, and no existing behavior is modified. Implementations that do not recognize the ZK extension continue to function correctly.

### 2.2 Message-Driven Activation

Zero-knowledge verification is controlled **solely by message content**, not by configuration flags or protocol negotiation. The presence of `zk_proof` in a SETTLE message is an **explicit, non-ambiguous request** for verification.

### 2.3 Deterministic Fallback

Absence of ZK extension fields results in **deterministic fallback** to standard TGP 3.4 validation. There is no ambiguity, no negotiation, and no partial states.

### 2.4 Buyer Sovereignty

Buyers **choose** whether to use ZK verification on a per-transaction basis. This choice is transparent through UI and bears the associated gas cost. Merchants MUST NOT require ZK verification unless explicitly agreed out-of-band.

### 2.5 Hard Verification Semantics

When ZK fields are present, verification is **non-bypassable**. Invalid or missing proofs MUST result in settlement rejection. There are no soft-fail paths, advisory checks, or trusted fallbacks.

---

## 3. Protocol Extension Overview

### 3.1 High-Level Flow

The TGP message flow remains unchanged:

```
QUERY → SETTLE → ACK
```

The 3.4-ZK extension modifies **only the internal validation logic** within SETTLE processing.

### 3.2 Extension Trigger

The extension is triggered by the presence of the `zk_proof` field in the SETTLE message:

| Condition | Behavior |
|-----------|----------|
| `zk_proof` present, `buyer_commitment` present | Verify ZK proof; fail if invalid |
| `zk_proof` present, `buyer_commitment` missing | Reject message (Z603 error) |
| `zk_proof` absent | Use standard TGP 3.4 validation |

---

## 4. SETTLE Message Extension

### 4.1 Schema Extension

The TGP 3.4 SETTLE message is extended with two optional fields:

```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "relay_data": {
    "permit_signature": "0x...",
    "permit_data": { }
  },
  "chain_id": 943,
  "preview_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",

  // TGP 3.4-ZK EXTENSION (OPTIONAL)
  "zk_proof": {
    "a": [
      "0x2a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
      "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
    ],
    "b": [
      [
        "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
        "0x4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d"
      ],
      [
        "0x5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e",
        "0x6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f"
      ]
    ],
    "c": [
      "0x7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b"
    ]
  },
  "buyer_commitment": "0x9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c"
}
```

### 4.2 Field Definitions

#### 4.2.1 `zk_proof` (Optional)

**Type:** Object (Groth16 proof)  
**Required:** No  
**Presence:** Triggers ZK verification

A Groth16 zero-knowledge proof consisting of three components:

- **`a`**: Array of 2 field elements (proof point A)
- **`b`**: 2×2 matrix of field elements (proof point B)
- **`c`**: Array of 2 field elements (proof point C)

All field elements are 256-bit unsigned integers encoded as hexadecimal strings with `0x` prefix.

**Requirements:**
- All array lengths MUST be exact (a=2, b=2×2, c=2)
- All values MUST be valid BN254 field elements (< field modulus)
- Proof MUST be generated using the canonical ZKB-01 circuit

#### 4.2.2 `buyer_commitment` (Conditional)

**Type:** String (uint256 as hex)  
**Required:** Yes, if `zk_proof` is present  
**Format:** `0x` + 64 hex characters

A Poseidon hash commitment binding the buyer to the transaction:

```
buyer_commitment = Poseidon(buyer_address, amount, nonce, buyer_salt)
```

This value serves as a public input to the zero-knowledge proof.

**Requirements:**
- MUST be present if `zk_proof` is present
- MUST be a valid BN254 field element
- MUST match the first public input in the proof

---

## 5. Processing Rules (Normative)

### 5.1 Message Validation

Upon receiving a SETTLE message, the Transaction Border Controller (TBC) MUST validate field consistency:

**Rule 1: ZK Field Pairing**

> If `zk_proof` is present, `buyer_commitment` MUST be present.

**Rule 2: ZK Proof Structure**

> If `zk_proof` is present, it MUST conform to the Groth16 proof structure:
> - `a`: Array of exactly 2 field elements
> - `b`: 2×2 matrix (array of 2 arrays, each containing 2 field elements)
> - `c`: Array of exactly 2 field elements

**Rule 3: Field Element Bounds**

> All field elements in `zk_proof` and `buyer_commitment` MUST be less than the BN254 field modulus:
> ```
> p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
> ```

### 5.2 Settlement Execution Flow

The TBC MUST process SETTLE messages according to this logic:

```
1. Parse SETTLE message
2. Validate TGP 3.4 base fields
3. IF zk_proof is present:
     a. Validate ZK field consistency (Rules 1-3)
     b. Extract buyer_commitment
     c. Build public inputs: [buyer_commitment, preview_hash, chain_id]
     d. Call on-chain verifier contract
     e. IF verification returns false:
          REJECT settlement (error Z601)
     f. IF verification call fails:
          REJECT settlement (error Z602)
     g. Log: "ZK proof verified (3.4-ZK)"
   ELSE:
     a. Log: "Standard TGP 3.4 validation"
4. Continue with standard settlement execution
5. Return ACK
```

### 5.3 Verification Requirements (Normative)

When `zk_proof` is present, the TBC MUST:

1. **Call the on-chain verifier contract** - No local/off-chain verification is permitted
2. **Use the canonical verifier address** - Configured in TBC deployment
3. **Include all public inputs in order**:
   - `public[0]`: `buyer_commitment`
   - `public[1]`: `preview_hash` (as uint256)
   - `public[2]`: `chain_id` (as uint256)
4. **Abort on verification failure** - Settlement MUST NOT proceed
5. **Not cache verification results** - Each SETTLE message is verified independently

### 5.4 Error Handling

The TBC MUST return specific error codes for ZK-related failures:

| Code | Condition |
|------|-----------|
| Z601 | ZK proof present but verification returned `false` |
| Z602 | ZK verification RPC/contract call failed |
| Z603 | ZK proof present but `buyer_commitment` missing |

Standard TGP 3.4 error codes apply to base field validation failures.

---

## 6. Zero-Knowledge Proof Semantics

### 6.1 Circuit Definition

The 3.4-ZK extension uses the **ZKB-01 circuit** (Buyer Commitment Proof):

**Public Inputs (3):**
1. `buyer_commitment` - Poseidon hash commitment
2. `preview_hash` - Transaction context binding
3. `chain_id` - Blockchain identifier

**Private Inputs (4):**
1. `buyer_address` - Wallet address (not revealed)
2. `amount` - Transaction amount (not revealed)
3. `nonce` - Unique transaction identifier (not revealed)
4. `buyer_salt` - Random entropy (not revealed)

**Constraint:**
```
Poseidon(buyer_address, amount, nonce, buyer_salt) == buyer_commitment
```

### 6.2 Security Properties

A valid ZK proof establishes:

1. **Commitment Knowledge:** The prover knows values that hash to `buyer_commitment`
2. **Context Binding:** The proof binds to the specific `preview_hash` and `chain_id`
3. **Privacy Preservation:** Private inputs are not revealed on-chain
4. **Non-Transferability:** Proof cannot be replayed for different transactions

### 6.3 Proof Generation

Proof generation MUST use:

- **Curve:** BN254 (alt_bn128)
- **Proving System:** Groth16
- **Hash Function:** Poseidon (for commitment)
- **Circuit:** ZKB-01 (canonical definition)
- **Trusted Setup:** Ceremony-generated parameters (verifiable)

### 6.4 Verifier Contract

The on-chain verifier contract MUST:

- Implement Groth16 verification for the ZKB-01 circuit
- Accept proof components `(a, b, c)` and public inputs `[3]`
- Return boolean result (`true` = valid, `false` = invalid)
- Be deterministic and gas-efficient (~250k gas)

**Reference Implementation:**
- Generated via: `snarkjs zkey export solidityverifier`
- Interface: `verifyProof(uint[2] a, uint[2][2] b, uint[2] c, uint[3] publicInputs) returns (bool)`

---

## 7. ACK Message Extension (Optional)

### 7.1 ZK Verification Metadata

ACK messages MAY include optional metadata about ZK verification:

```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "SETTLED",
  "tx_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "timestamp": 1704067200,
  
  "zk_verification": {
    "verified": true,
    "verifier_contract": "0x016482e1F17752e6Df63AcD54f5a9D4c1076d3a7",
    "gas_used": 247813
  }
}
```

### 7.2 Metadata Fields

- **`verified`**: Boolean indicating successful proof verification
- **`verifier_contract`**: Address of the on-chain verifier used
- **`gas_used`**: Gas consumed by verification call

**Note:** This metadata is **informational only** and does not affect protocol correctness. Clients SHOULD NOT rely on its presence.

---

## 8. Security Properties

### 8.1 Threat Model

The 3.4-ZK extension defends against:

1. **Malicious Wallet Software:** Cannot forge buyer commitment without private inputs
2. **Transaction Replay:** Proof binds to specific `preview_hash` and `chain_id`
3. **Privacy Leakage:** No sensitive data revealed on-chain
4. **Downgrade Attacks:** Explicit opt-in prevents silent degradation

### 8.2 Cryptographic Assumptions

Security relies on:

- **Discrete Log Hardness:** BN254 elliptic curve security
- **Trusted Setup Integrity:** Ceremony parameters not compromised
- **Hash Function Security:** Poseidon collision resistance
- **Verifier Correctness:** On-chain contract implements Groth16 correctly

### 8.3 Known Limitations

1. **Gas Cost:** Verification adds ~250k gas (~$0.000001 on PulseChain)
2. **Setup Trust:** Requires trusting the Powers of Tau ceremony
3. **Circuit Bugs:** Implementation errors in circuit or verifier are not cryptographically detectable
4. **On-Chain Visibility:** While private inputs are hidden, proof existence is public

---

## 9. Backward Compatibility

### 9.1 Compatibility Matrix

| Component | TGP 3.4 (no ZK) | TGP 3.4-ZK |
|-----------|-----------------|------------|
| **Message Format** | Compatible | Compatible |
| **SETTLE without ZK** | ✅ Works | ✅ Works |
| **SETTLE with ZK** | ⚠️ Ignores ZK fields | ✅ Verifies |
| **ACK Format** | Compatible | Compatible |

### 9.2 Migration Path

**For TBC Operators:**

1. Deploy ZKB-01 verifier contract to blockchain
2. Configure verifier address in TBC
3. Update TBC to version supporting 3.4-ZK
4. No changes required to existing integrations

**For Wallet Developers (CPW):**

1. Add ZK proof generation capability
2. Provide UI toggle for "Enable Privacy Mode"
3. Include `zk_proof` and `buyer_commitment` when enabled
4. Omit fields when disabled (legacy mode)

**For Merchants:**

No changes required. Merchants transparently support both:
- Legacy TGP 3.4 transactions (no ZK)
- Privacy-enhanced 3.4-ZK transactions

---

## 10. Implementation Guidance

### 10.1 TBC Implementation

**Verifier Initialization:**

```rust
// Initialize verifier if address is configured
let verifier = if let Some(addr) = config.zk_verifier_address {
    Some(BuyerIntentVerifier::new(addr, rpc_url).await?)
} else {
    None
};
```

**Settlement Handler:**

```rust
if let Some(zk_proof) = &settle_msg.zk_proof {
    // 3.4-ZK extension requested
    let commitment = settle_msg.buyer_commitment
        .ok_or(Error::Z603)?;
    
    let verifier = verifier.as_ref()
        .ok_or("Verifier not configured")?;
    
    let public_inputs = [commitment, preview_hash, chain_id];
    let valid = verifier.verify(zk_proof, &public_inputs).await?;
    
    if !valid {
        return Err(Error::Z601);
    }
} else {
    // Standard TGP 3.4 validation
}
```

### 10.2 CPW Implementation

**Proof Generation:**

```typescript
async function generateZKProof(params: {
  buyer_address: string,
  amount: bigint,
  nonce: bigint,
  buyer_salt: bigint,
  preview_hash: string,
  chain_id: number
}) {
  // Compute buyer commitment
  const commitment = poseidon([
    params.buyer_address,
    params.amount,
    params.nonce,
    params.buyer_salt
  ]);
  
  // Generate proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      buyer_address: params.buyer_address,
      amount: params.amount,
      nonce: params.nonce,
      buyer_salt: params.buyer_salt,
      buyer_commitment: commitment,
      preview_hash: params.preview_hash,
      chain_id: params.chain_id
    },
    "zkb_01.wasm",
    "zkb_01_final.zkey"
  );
  
  return {
    zk_proof: {
      a: proof.pi_a.slice(0, 2),
      b: [proof.pi_b[0].slice(0, 2), proof.pi_b[1].slice(0, 2)],
      c: proof.pi_c.slice(0, 2)
    },
    buyer_commitment: commitment
  };
}
```

**Message Builder:**

```typescript
async function buildSettleMessage(order: Order, useZK: boolean) {
  const base = {
    order_id: order.id,
    relay_data: buildRelayData(order),
    chain_id: 943,
    preview_hash: computePreviewHash(order)
  };
  
  if (useZK) {
    const { zk_proof, buyer_commitment } = await generateZKProof({
      buyer_address: order.buyer,
      amount: order.amount,
      nonce: order.nonce,
      buyer_salt: generateRandomSalt(),
      preview_hash: base.preview_hash,
      chain_id: base.chain_id
    });
    
    return { ...base, zk_proof, buyer_commitment };
  }
  
  return base;
}
```

### 10.3 Configuration

**Environment Variables:**

```bash
# Verifier contract address (required for 3.4-ZK support)
TBC_ZK_VERIFIER_ADDRESS=0x016482e1F17752e6Df63AcD54f5a9D4c1076d3a7

# RPC endpoint for verification (required)
TBC_RPC_URL_943=https://rpc.v4.testnet.pulsechain.com
```

**No `zk_enabled` flag** - verification is message-based, not config-based.

---

## 11. Gas Cost Considerations

### 11.1 Cost Breakdown

| Operation | Gas Cost | USD Equivalent (at $0.0001/PLS, 1 gwei) |
|-----------|----------|------------------------------------------|
| **Groth16 Verification** | ~250,000 | ~$0.000025 |
| **Standard Settlement** | ~180,000 | ~$0.000018 |
| **Total (3.4-ZK)** | ~430,000 | ~$0.000043 |
| **Additional Cost** | ~70,000 | ~$0.000007 |

### 11.2 Cost-Benefit Analysis

**Benefits of ZK Verification:**
- Cryptographic proof of buyer intent
- Enhanced privacy (no wallet address on-chain)
- Trust minimization (no reliance on wallet honesty)

**Costs:**
- Additional ~70k gas (~$0.000007 at current PLS prices)
- Proof generation time (~2-5 seconds in browser)
- Circuit trust assumption (Powers of Tau ceremony)

**Recommendation:** Offer as opt-in toggle with clear cost disclosure.

---

## 12. Error Codes

### 12.1 ZK-Specific Errors

| Code | Message | Cause |
|------|---------|-------|
| **Z601** | ZK_PROOF_INVALID | Proof verification returned `false` |
| **Z602** | ZK_VERIFICATION_FAILED | RPC/contract call failed during verification |
| **Z603** | BUYER_COMMITMENT_MISSING | `zk_proof` present but `buyer_commitment` missing |

### 12.2 Standard TGP 3.4 Errors

All existing TGP 3.4 error codes remain valid and apply to base field validation.

---

## 13. Examples

### 13.1 Standard TGP 3.4 SETTLE (No ZK)

```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "relay_data": {
    "permit_signature": "0xabc...",
    "permit_data": { }
  },
  "chain_id": 943,
  "preview_hash": "0x1234...abcd"
}
```

**Processing:**
- No `zk_proof` field present
- TBC uses standard 3.4 validation
- No additional gas cost

---

### 13.2 TGP 3.4-ZK SETTLE (With ZK Proof)

```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "relay_data": {
    "permit_signature": "0xabc...",
    "permit_data": { }
  },
  "chain_id": 943,
  "preview_hash": "0x1234...abcd",
  
  "zk_proof": {
    "a": [
      "0x2a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
      "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
    ],
    "b": [
      [
        "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c",
        "0x4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d"
      ],
      [
        "0x5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e",
        "0x6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f"
      ]
    ],
    "c": [
      "0x7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
      "0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b"
    ]
  },
  "buyer_commitment": "0x9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c"
}
```

**Processing:**
- `zk_proof` field present → triggers 3.4-ZK extension
- TBC verifies proof on-chain
- Additional ~70k gas cost
- Settlement proceeds only if proof valid

---

### 13.3 Invalid Message (Proof Without Commitment)

```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "relay_data": { },
  "chain_id": 943,
  "preview_hash": "0x1234...abcd",
  
  "zk_proof": {
    "a": ["0x...", "0x..."],
    "b": [["0x...", "0x..."], ["0x...", "0x..."]],
    "c": ["0x...", "0x..."]
  }
  // Missing buyer_commitment
}
```

**Processing:**
- TBC detects inconsistency
- Returns error Z603: `BUYER_COMMITMENT_MISSING`
- Settlement rejected

---

## 14. References

### 14.1 Normative References

- **[TGP-3.4]** Transaction Gateway Protocol 3.4 Core Specification
- **[GROTH16]** Jens Groth. "On the Size of Pairing-based Non-interactive Arguments." EUROCRYPT 2016
- **[BN254]** Barreto-Naehrig curve specification
- **[POSEIDON]** Grassi et al. "Poseidon: A New Hash Function for Zero-Knowledge Proof Systems"

### 14.2 Informative References

- **[SNARKJS]** iden3/snarkjs - JavaScript implementation of zkSNARK schemes
- **[CIRCOM]** iden3/circom - Circuit compiler for zero-knowledge proofs
- **[ZKB01]** CoreProve ZKB-01 Circuit Specification (internal)

### 14.3 Related Standards

- **RFC 2119** - Key words for use in RFCs (MUST, SHOULD, MAY)
- **EIP-712** - Typed structured data hashing and signing
- **EIP-2612** - Permit extension for ERC-20 tokens

---

## Appendix A: Field Element Encoding

### A.1 BN254 Field Modulus

```
p = 21888242871839275222246405745257275088548364400416034343698204186575808495617
```

### A.2 Hexadecimal Encoding

Field elements are encoded as:
- 256-bit unsigned integers
- Big-endian byte order
- Hexadecimal string with `0x` prefix
- Zero-padded to 64 hex characters (32 bytes)

**Example:**
```
Decimal: 12345
Hex: 0x0000000000000000000000000000000000000000000000000000000000003039
```

---

## Appendix B: Proof Normalization

### B.1 Coordinate System Mismatch

The snarkjs library outputs proofs in a different coordinate system than Solidity verifiers expect. Specifically, the `b` component requires transposition.

**snarkjs Output:**
```javascript
proof.pi_b = [
  [b00, b01],
  [b10, b11]
]
```

**Solidity Expected:**
```solidity
uint[2][2] b = [
  [b00, b10],  // Transposed
  [b01, b11]   // Transposed
]
```

### B.2 Normalization Algorithm

```typescript
function normalizeProofForSolidity(proof: SnarkjsProof): SolidityProof {
  return {
    a: proof.pi_a.slice(0, 2),
    b: [
      [proof.pi_b[0][0], proof.pi_b[1][0]],  // Transpose
      [proof.pi_b[0][1], proof.pi_b[1][1]]   // Transpose
    ],
    c: proof.pi_c.slice(0, 2)
  };
}
```

**Critical:** Failure to normalize results in verification failure despite valid proof.

---

## Appendix C: Deployment Checklist

### C.1 Contract Deployment

- [ ] Deploy ZKB-01 verifier contract to target blockchain
- [ ] Verify contract source code on block explorer
- [ ] Test verifier with known valid/invalid proofs
- [ ] Record contract address for TBC configuration

### C.2 TBC Configuration

- [ ] Set `TBC_ZK_VERIFIER_ADDRESS` environment variable
- [ ] Configure RPC endpoint for verification calls
- [ ] Test verifier initialization at TBC startup
- [ ] Verify TBC handles both legacy and ZK messages

### C.3 CPW Integration

- [ ] Add ZK proof generation capability
- [ ] Implement proof normalization
- [ ] Add UI toggle for privacy mode
- [ ] Test end-to-end with TBC
- [ ] Measure proof generation time (target: <5s)

### C.4 Testing

- [ ] Test standard TGP 3.4 message (no ZK)
- [ ] Test ZK message with valid proof
- [ ] Test ZK message with invalid proof
- [ ] Test ZK message without commitment (expect Z603)
- [ ] Test verifier unavailable scenario
- [ ] Measure gas costs
- [ ] Load test with concurrent ZK verifications

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-01 | Initial TGP 3.4-ZK specification |

---

**End of Specification**

