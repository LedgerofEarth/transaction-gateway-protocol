# TGP-EXT-00 — Extension Philosophy and Rules

**Version:** 1.0  
**Status:** Specification  
**Date:** 2025-01-02  
**License:** Apache 2.0

---

## 1. Purpose

This document defines the philosophy, rules, and guarantees for extending the Transaction Gateway Protocol (TGP). It ensures that extensions remain backward-compatible, optional, and do not fragment the protocol ecosystem.

---

## 2. Why TGP Uses Extensions

### 2.1 Problem Statement

Protocol evolution faces a fundamental tension:

- **Innovation** — New features enable new use cases
- **Stability** — Breaking changes fragment ecosystems and break existing implementations

Traditional approaches fail:

- **Version forks** create incompatible ecosystems (Bitcoin vs Bitcoin Cash)
- **Optional fields without rules** lead to ambiguous behavior
- **Flag-based negotiation** adds complexity and attack surface

### 2.2 Extension Model Solution

TGP uses an **additive extension model** where:

1. **Base protocol remains stable and complete**
2. **Extensions add strictly optional functionality**
3. **Presence of extension fields triggers extension behavior**
4. **Absence of extension fields results in deterministic base behavior**

This enables innovation without fragmentation.

---

## 3. Core Principles

### 3.1 Additive-Only Semantics

**All changes are purely additive.**

- ✅ Adding optional fields is allowed
- ✅ Adding new message types is allowed
- ✅ Adding new error codes is allowed
- ❌ Changing existing field meanings is forbidden
- ❌ Removing fields is forbidden
- ❌ Changing base protocol behavior is forbidden

### 3.2 Message-Driven Activation

**Extensions are controlled solely by message content, not by configuration flags or protocol negotiation.**

- ✅ Presence of extension field = extension requested
- ✅ Absence of extension field = base protocol behavior
- ❌ No `extensions_enabled` configuration flags
- ❌ No version negotiation handshakes
- ❌ No partial extension states

This ensures deterministic behavior and eliminates ambiguity.

### 3.3 Deterministic Fallback

**Absence of extension fields results in deterministic fallback to base protocol.**

- No ambiguity about which mode is active
- No negotiation required
- No partial states where some extension features are enabled

### 3.4 Buyer/User Sovereignty

**Users choose whether to use extensions on a per-transaction basis.**

- Extensions must be opt-in
- Cost disclosure must be clear (e.g., additional gas for ZK verification)
- UI must make extension usage transparent
- Merchants MUST NOT require extensions unless explicitly agreed

### 3.5 Hard Verification Semantics

**When extension fields are present, verification is non-bypassable.**

- Invalid extension data MUST result in rejection
- No soft-fail paths
- No advisory checks
- No trusted fallbacks

Extensions provide cryptographic guarantees, not hints.

---

## 4. Extension Design Rules

### 4.1 Field Naming

Extension fields MUST:

- Be clearly named to indicate their purpose
- Not conflict with existing base protocol fields
- Not use reserved or common names without clear differentiation

**Example:**

- ✅ `zk_proof` — Clear extension prefix
- ✅ `buyer_commitment` — Descriptive and unique
- ❌ `proof` — Too generic, may conflict
- ❌ `data` — Ambiguous purpose

### 4.2 Dependency Management

Extensions MUST define:

1. **Base protocol version required**
2. **Other extensions required (if any)**
3. **Incompatible extensions (if any)**

**Example from TGP-00 v3.4-ZK:**

```
Base Protocol: TGP-00 v3.4
Required Extensions: None
Incompatible Extensions: None
```

### 4.3 Error Handling

Extensions MUST:

- Define specific error codes for extension failures
- Use error code ranges that don't conflict with base protocol
- Provide clear error messages indicating extension-specific issues

**Example:**

- Base protocol errors: `P001`-`P099`, `A100`-`A199`, etc.
- ZK extension errors: `Z601`-`Z699`

### 4.4 Backward Compatibility

Extensions MUST maintain backward compatibility:

- Implementations without extension support MUST continue to function
- Base protocol messages MUST NOT become invalid
- Extensions MUST NOT break existing economic guarantees

---

## 5. Extension Approval Process

### 5.1 Specification Requirements

A new extension proposal MUST include:

1. **Motivation** — What problem does it solve?
2. **Design** — Complete technical specification
3. **Security analysis** — Threat model and mitigations
4. **Compatibility analysis** — Impact on existing implementations
5. **Reference implementation** — Proof of concept
6. **Test vectors** — Example messages and expected behavior

### 5.2 Review Criteria

Extensions are evaluated on:

- **Necessity** — Does it solve a real problem?
- **Minimalism** — Is it the simplest solution?
- **Safety** — Does it introduce new risks?
- **Compatibility** — Does it break existing implementations?
- **Clarity** — Is the specification unambiguous?

### 5.3 Approval Authority

**Community consensus** is required for extension approval. The process:

1. Proposal submitted as GitHub PR or issue
2. Public discussion period (minimum 2 weeks)
3. Implementation feedback from multiple parties
4. Consensus decision (no single veto authority)

---

## 6. Extension Versioning

### 6.1 Extension Version Numbers

Extensions use semantic versioning:

```
TGP-00-v<BASE>-<EXTENSION>
```

**Example:**

- `TGP-00-v3.4-ZK` — ZK extension for TGP-00 v3.4

### 6.2 Breaking Changes in Extensions

If an extension requires breaking changes:

1. Create new extension version (e.g., `v3.4-ZK2`)
2. Maintain parallel support during transition
3. Deprecate old extension version with timeline
4. Eventually remove old extension support

---

## 7. Example: TGP-00 v3.4-ZK Extension

### 7.1 What It Adds

Two optional fields in SETTLE message:

```json
{
  "zk_proof": { "a": [...], "b": [[...]], "c": [...] },
  "buyer_commitment": "0x..."
}
```

### 7.2 Activation Logic

```
IF zk_proof present:
    IF buyer_commitment missing:
        REJECT with Z603
    ELSE:
        Verify ZK proof on-chain
        IF verification fails:
            REJECT with Z601
        ELSE:
            Proceed with settlement
ELSE:
    Use standard TGP 3.4 validation (no ZK)
```

### 7.3 Backward Compatibility

- Gateways without ZK support: Ignore ZK fields (or reject if strict validation enabled)
- Wallets without ZK support: Send messages without ZK fields
- Both implementations interoperate safely

### 7.4 User Choice

User sees UI:

```
☐ Enable Privacy Mode (+$0.000007 gas cost)
```

If checked: Wallet includes `zk_proof` + `buyer_commitment`  
If unchecked: Wallet sends standard message

---

## 8. Anti-Patterns

### 8.1 What NOT To Do

❌ **Configuration-Based Extensions**

```rust
// BAD: Extension controlled by config
if config.zk_enabled {
    verify_zk_proof();
}
```

✅ **Message-Based Extensions**

```rust
// GOOD: Extension controlled by message content
if msg.zk_proof.is_some() {
    verify_zk_proof()?;
}
```

---

❌ **Optional Verification**

```rust
// BAD: Extension can be bypassed
if let Some(proof) = msg.zk_proof {
    if verify_zk_proof(&proof).is_ok() {
        // proceed
    }
    // Still proceed even if verification fails
}
```

✅ **Mandatory Verification**

```rust
// GOOD: Extension verification is required when present
if let Some(proof) = msg.zk_proof {
    verify_zk_proof(&proof)?; // Fail hard if verification fails
}
```

---

❌ **Partial Extension States**

```rust
// BAD: Some extension features without others
if msg.zk_proof.is_some() && !msg.buyer_commitment.is_some() {
    // What should happen here? Ambiguous!
}
```

✅ **Complete Extension State**

```rust
// GOOD: Extension requires all fields or none
match (msg.zk_proof, msg.buyer_commitment) {
    (Some(proof), Some(commitment)) => verify_zk(&proof, &commitment)?,
    (None, None) => /* base protocol */,
    _ => return Err(InconsistentExtensionFields),
}
```

---

## 9. Future Extensions

Potential future extensions (examples):

- **Multi-Sig Settlement** — `TGP-00-v3.4-MULTISIG`
- **Cross-Chain Atomic Swaps** — `TGP-00-v3.4-ATOMIC`
- **Recurring Payments** — `TGP-00-v3.4-RECURRING`
- **Gasless Execution** — `TGP-00-v3.4-GASLESS`

Each would follow the rules defined in this document.

---

## 10. Summary

**TGP extensions enable innovation while preventing fragmentation.**

### Key Rules:

1. ✅ Extensions are **additive only**
2. ✅ Activation is **message-driven**
3. ✅ Fallback is **deterministic**
4. ✅ Users have **sovereignty**
5. ✅ Verification is **mandatory**

### Benefits:

- Base protocol remains stable
- Innovation happens at the edges
- Implementations interoperate
- Users choose what features to use
- No ecosystem fragmentation

---

## 11. References

- **TGP-00 v3.4** — Base protocol specification
- **TGP-00 v3.4-ZK** — Example extension (zero-knowledge proofs)
- **RFC 2119** — Key words for use in RFCs (MUST, SHOULD, MAY)

---

**This document is part of the Transaction Gateway Protocol specification.**  
**License:** Apache 2.0

