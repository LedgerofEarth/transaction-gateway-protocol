

# 📌 Spec Amendment — Optional Layered Withdrawal Policy

**Applies to:** TGP-00 v3.4
**Status:** OPTIONAL / FORWARD-COMPATIBLE
**Impact:** None on existing deployments

---

## Amendment: Optional Layered Withdrawal Policy (Non-Breaking)

### 1. Scope & Intent

This amendment defines an **optional withdrawal policy layer** that MAY be implemented by settlement contracts to provide **time-delayed and revocable withdrawal execution** for selected withdrawal authorities.

This mechanism is:

* **Optional**
* **Non-custodial**
* **Contract-enforced**
* **Fully compatible with multisig**
* **Non-breaking for existing contracts**

Settlement contracts **MAY implement this policy** without affecting the semantics of `SETTLE`, `WITHDRAW`, or merchant sovereignty.

---

## 2. Compatibility with Multisig (Explicit)

This amendment **does not replace, restrict, or conflict with multisig** usage.

### Clarification (Normative)

> Multisignature wallets MAY be used as:
>
> * Merchant payout addresses
> * Withdrawal authorities (WAKs)
> * Revocation authorities
>
> Layered withdrawal policies apply **equally** whether the caller is:
>
> * An EOA
> * A multisig contract
> * A smart-contract wallet (e.g. Safe)

The delay / revocation logic applies **after authorization**, not instead of it.

**Multisig remains orthogonal.**

---

## 3. Withdrawal Authority Policy Extension (Optional)

Settlement contracts MAY extend withdrawal authority configuration to include a **withdrawal execution policy**.

### Conceptual Model

```text
Authorization (who may withdraw)
+
Policy (how the withdrawal executes)
```

Authorization answers **“who”**
Policy answers **“how and when”**

---

## 4. Optional Withdrawal Execution Modes

Settlement contracts MAY support the following modes **per withdrawal authority**:

### 4.1 INSTANT

* Withdrawal executes immediately upon invocation
* Equivalent to the current deployed behavior
* No delay, no revocation window

### 4.2 DELAYED (Layered Withdrawal)

* Withdrawal enters a **pending state**
* Funds remain escrowed during a delay window
* Withdrawal MAY be revoked before completion
* Withdrawal MUST be explicitly finalized after delay

---

## 5. Two-Phase Withdrawal Semantics (Delayed Mode Only)

If implemented, delayed withdrawals follow this lifecycle:

```
initiateWithdraw(order_id)
→ PENDING
→ (delay window)
→ finalizeWithdraw(order_id)
→ WITHDRAWN
```

Optional:

```
revokeWithdraw(order_id)
→ REVOKED
```

### Key Properties

* Funds are never released until finalization
* Revocation does not require backend trust
* Delay duration is contract-defined or authority-defined
* Instant withdrawals remain unaffected

---

## 6. Non-Interference Guarantee (Important)

### Normative Statement

> Settlement contracts that do not implement layered withdrawal policies MUST continue to treat `WITHDRAW` as an immediate, irreversible action.

This amendment:

* Does **not** change the meaning of `WITHDRAW`
* Does **not** require new message types
* Does **not** alter existing deployments
* Does **not** mandate TBC involvement

---

## 7. Observability (Recommended, Not Required)

Contracts implementing delayed withdrawals SHOULD emit lifecycle events:

* Withdrawal initiated
* Withdrawal revoked
* Withdrawal finalized

This enables:

* Merchant dashboards
* Security alerts
* Accounting systems
* External monitoring

---

## 8. Security & Design Rationale (Non-Normative)

Layered withdrawal policies provide:

* Defense-in-depth for treasury operations
* Safe use of automation and agents
* Time-based oversight without coordination friction
* Risk-weighted authority delegation

They are **not approvals**, **not custody**, and **not governance gates**.

---

# ✅ Proceeding with Current Testing (Green Light)

Now the important operational part:

### You are clear to proceed with testing **now** because:

* The currently deployed settlement contract:

  * Supports immediate withdrawal
  * Matches the **INSTANT** mode
  * Is fully compliant with TGP-00 v3.4
* This amendment is:

  * Forward-looking
  * Optional
  * Non-breaking

### Testing focus for the current model should remain:

* ✔ Order-ID–based lookup
* ✔ Wallet-initiated withdrawal (CPE / CPW / external wallets)
* ✔ Backend-initiated withdrawal (stateless)
* ✔ Idempotency handling
* ✔ Gas-relayed withdrawals (where supported)
* ✔ Multisig payout addresses

No changes required to contracts, TBC, or wallet flows to continue.

---

## 🔒 Architectural Outcome

* **Spec evolves without blocking shipping**
* **Security improves without forcing adoption**
* **Multisig stays first-class**
* **Merchants choose their risk profile**
* **Backends stay stateless**
* **Wallets stay sovereign**
