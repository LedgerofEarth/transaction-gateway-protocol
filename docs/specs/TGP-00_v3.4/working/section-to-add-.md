

## 🔐 **Section X — Signature Schemes & Canonical Signing (ADDENDUM v3.4)**



**Status:** Normative
**Applies to:** TGP v3.4
**Location:** Part 1 — Core Protocol (after Canonical Hashing & Signatures)
**Audience:** TBC, CPE, CPW implementers

---

## **X.1 Signature Scheme Declaration (REQUIRED)**

All **signed TGP messages** MUST explicitly declare the signing scheme used.

```jsonc
{
  "signature": "0x…",
  "signature_scheme": "CANONICAL_JSON" | "EIP712"
}
```

**Rules:**

1. `signature_scheme` is **MANDATORY** for all signed messages.
2. Implementations MUST NOT infer the signing scheme from:

   * Wallet behavior
   * Message structure
   * Presence or absence of typed fields
3. Messages missing `signature_scheme` MUST be rejected.

> **Rationale:**
> Eliminates implicit wallet assumptions and prevents cross-scheme verification failures.

---

## **X.2 Message-Level Scheme Requirements**

For **TGP v3.4**, allowed schemes are constrained by message type:

| Message Type | Signature Required | Allowed Schemes        |
| ------------ | ------------------ | ---------------------- |
| `QUERY`      | YES                | CANONICAL_JSON, EIP712 |
| `SETTLE`     | YES                | CANONICAL_JSON, EIP712 |
| `WITHDRAW`   | YES                | CANONICAL_JSON, EIP712 |
| `PREVIEW`    | NO                 | —                      |
| `ACK`        | NO                 | —                      |
| `ERROR`      | NO                 | —                      |

Messages signed with a scheme not allowed for their type MUST be rejected with:

```
A103_UNSUPPORTED_SIGNATURE_SCHEME
```

---

## **X.3 CANONICAL_JSON Signing (Protocol-Native)**

### **X.3.1 Canonical Hash Construction**

When `signature_scheme = CANONICAL_JSON`:

1. Remove the following fields:

   * `signature`
   * `signature_scheme`
2. Canonicalize the JSON:

   * UTF-8 encoding
   * Lexicographically sorted keys
   * No whitespace or formatting variance
3. Compute:

```
message_hash = keccak256(canonical_json_bytes)
```

4. Sign `message_hash` using raw secp256k1 ECDSA.

---

### **X.3.2 Canonical Signing Restrictions (CRITICAL)**

For `CANONICAL_JSON` signing:

* **EIP-191 / Ethereum Signed Message prefix MUST NOT be applied**
* **EIP-712 domain separation MUST NOT be applied**
* The signature MUST be over the **raw 32-byte digest**

Any detection of prefixed signing MUST result in rejection:

```
A104_PREFIX_NOT_ALLOWED
```

> **Rationale:**
> Canonical signing commits directly to protocol semantics and must remain prefix-free.

---

### **X.3.3 Verification**

TBC MUST:

1. Recompute `message_hash`
2. Recover signer via secp256k1
3. Compare recovered address to `origin_address`
4. Reject on mismatch:

```
A101_ADDRESS_MISMATCH
```

---

## **X.4 EIP-712 Signing (Wallet-Native, Optional)**

### **X.4.1 Typed Domain (REQUIRED)**

When `signature_scheme = EIP712`, the following domain MUST be used:

```jsonc
{
  "name": "Transaction Gateway Protocol",
  "version": "3.4",
  "chainId": <chain_id>
}
```

Deviation from this domain MUST be rejected:

```
A104_INVALID_TYPED_DOMAIN
```

---

### **X.4.2 Typed Message Derivation**

The EIP-712 `message` MUST be derived from the **canonical message**:

* `signature` field excluded
* `signature_scheme` field excluded
* Field names, ordering, and values MUST match canonical semantics
* Nested objects MUST preserve structure

This ensures:

> **EIP-712 and CANONICAL_JSON signatures commit to the same transaction intent.**

---

### **X.4.3 Verification**

TBC MUST:

1. Reconstruct typed data from canonical fields
2. Verify via `eth_signTypedData`
3. Compare recovered address to `origin_address`
4. Reject on mismatch

---

## **X.5 Wallet (CPW) Signing Contract**

Wallets acting as CPW **MUST enforce input correctness** based on `signature_scheme`.

| Scheme         | Required Inputs              |
| -------------- | ---------------------------- |
| CANONICAL_JSON | `hash`                       |
| EIP712         | `domain`, `types`, `message` |

Rules:

1. CPW MUST reject signing requests with missing required inputs
2. CPW MUST NOT synthesize or infer missing inputs
3. CPW MUST NOT substitute signing schemes

Rejection MUST return:

```
CPW_SIGNING_REJECTED
```

---

## **X.6 Preview Hash Binding (v3.4)**

For all `SETTLE` messages (any scheme):

* `preview_hash` MUST be included in the signed payload
* Preview hash is protocol-critical and immutable
* Signature scheme MUST NOT alter preview semantics

This guarantees:

* No preview substitution
* No settlement redirection
* Cross-scheme semantic equivalence

---

## **X.7 Error Codes (Additive)**

| Code                                | Meaning                                |
| ----------------------------------- | -------------------------------------- |
| `A101_ADDRESS_MISMATCH`             | Recovered signer does not match origin |
| `A103_UNSUPPORTED_SIGNATURE_SCHEME` | Scheme not allowed for message type    |
| `A104_INVALID_TYPED_DOMAIN`         | Invalid EIP-712 domain                 |
| `A104_PREFIX_NOT_ALLOWED`           | EIP-191 prefix detected                |
| `P002_MISSING_FIELD`                | Required field missing                 |

---

## **X.8 Security & Interoperability Notes (Non-Normative)**

* Canonical signing is ideal for:

  * Deterministic replay
  * Headless agents
  * Server-side automation
* EIP-712 is ideal for:

  * Browser wallets
  * Hardware wallets
  * User-visible approvals

TGP deliberately supports **both**, without privileging wallet behavior over protocol integrity.

---

### ✅ **Result**

With this addendum:

* CPE knows **what to request**
* CPW knows **what to sign**
* TBC knows **how to verify**
* No guessing, no prefix traps, no scheme drift

