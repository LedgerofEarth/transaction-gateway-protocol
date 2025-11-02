# VGP One-Pager: Value Gateway Protocol

**Tagline:** *BGP for value — routing payments across trust boundaries*

---

## What is VGP?

**Value Gateway Protocol (VGP)** is a trust-boundary routing protocol that enables atomic value transfers across administrative, economic, or policy domains without requiring global trust.

Think **BGP** (Internet routing) meets **Lightning Network** (payment channels) — but for *any* value transfer, not just cryptocurrency.

---

## Why VGP?

### The Problem
- Modern systems need to exchange value across **trust boundaries** (org ↔ org, agent ↔ agent, tier ↔ tier)
- Existing solutions require:
  - **Centralized intermediaries** (high cost, single point of failure)
  - **Pre-established trust** (slow onboarding, limited scale)
  - **Siloed networks** (no interoperability)

### The Solution
VGP enables:
- **Atomic settlement** via HTLCs (all-or-nothing transfers)
- **Path-vector routing** (advertise costs/policies without exposing internals)
- **Policy enforcement** at E-NAT wallets (compliance, rate limits, risk scoring)
- **Zero global trust** (each hop validates locally)

---

## How It Works

### 1. **Discover Paths**
Client sends `QUERY` → Gateways respond with `ADVERT` messages containing:
- Available routes
- Costs (base + variable)
- Compliance requirements
- Risk scores

### 2. **Lock Value**
Client selects path → Gateways create HTLCs (Hashed Time-Locked Contracts):
- Funds locked with cryptographic hash at each gateway
- Timeout ensures refund if service fails
- Secret reveal triggers atomic unlock cascade across all hops

### 3. **Deliver Service**
Provider delivers service via x402 protocol:
- Request/response logged in TDRs (Transaction Detail Records)
- Proof-of-value generated (signed logs, attestations)

### 4. **Settle**
Provider reveals secret → HTLCs unlock in cascade:
- All intermediaries paid simultaneously
- No party can steal funds or fail to pay
- Full audit trail via signed TDRs

---

## Key Components

### Gateway Functions
VGP gateways manage trust boundaries by:
- Holding HTLCs for cross-domain transfers
- Enforcing local policy (KYC, rate limits, compliance)
- Routing messages between peered domains
- Coordinating atomic settlement

**Note:** Many implementations use Economic NAT (E-NAT) border wallets for policy isolation, but this is implementation-specific.

### Message Types
- **QUERY** / **ADVERT** — Path discovery
- **SELECT** / **LOCKED** — HTLC creation
- **PROOF** / **SETTLE** — Atomic settlement
- **ERROR** — Failure handling

### State Machine
```
DISCOVER → QUOTED → SELECTED → LOCKED → SERVING → PROVED → SETTLED → CLOSED
                                   ↓
                             (timeout) → REFUNDED → CLOSED
```

---

## Use Cases

### 1. **Multi-Cloud Cost Routing**
Enterprise app routes requests across AWS/GCP/Azure based on real-time pricing:
- Each cloud advertises costs via VGP
- App selects cheapest path with required SLA
- Payment settled atomically on delivery

### 2. **Agentic Marketplaces**
AI agents buy/sell services (compute, data, models) across organizational boundaries:
- Agents advertise capabilities + costs
- HTLCs ensure payment only on verified delivery
- No pre-trust required — protocol guarantees settlement

### 3. **Tiered Access**
SaaS platform routes users across free/pro/enterprise tiers:
- VGP enforces usage caps, compliance at tier boundaries
- Automatic upgrade path when free tier exhausted
- Transparent cost signaling for users

### 4. **Cross-Border Payments**
Remittance across payment rails (SWIFT, SEPA, ACH, crypto):
- Each rail advertises FX rates + settlement times
- VGP routes via cheapest/fastest path
- HTLC ensures no funds lost if intermediary fails

---

## Integration with x402

**x402** = transport + signaling layer (QUIC/mTLS, TDR logging)  
**VGP** = economic routing layer (path discovery, HTLC coordination)

VGP state carried in x402 `htlc-path` header:
```
htlc-path: request_id=req-123; path_id=path-1; htlc_id=htlc-456; status=LOCKED
```

This enables:
- x402 routers log VGP state in TDRs
- Proof-of-value tied to service delivery
- Atomic settlement coordinated across hops

---

## Security Guarantees

1. **Atomic settlement:** HTLC secret reveal is all-or-nothing
2. **Timeout protection:** Refunds prevent lock-up attacks
3. **Cryptographic proofs:** Ed25519 signatures prevent forgery
4. **Policy isolation:** Gateways enforce local rules without global coordination
5. **Privacy:** Path-vector design hides internal topology

---

## Status & Roadmap

**Current:** v0.1-draft (published by Ledger of Earth)

**Next Steps:**
- Reference implementation (Rust/Go)
- x402 `htlc-path` PR
- Attribute registry expansion (multi-currency, ZKP compliance)
- Testnet deployment

---

## Get Involved

- **Spec:** [github.com/ledgerofearth/vgp](https://github.com/ledgerofearth/vgp)
- **Discussions:** GitHub Issues
- **Extensions:** Submit proposals via issue template

---

**VGP enables the Internet of Value — routing payments as flexibly as we route packets.**
