# Transaction Gateway Protocol (TGP-00)

**Version:** 0.1-draft  
**Status:** Draft  
**Published:** 2025  
**Organization:** Ledger of Earth

—

## Table of Contents

- **Abstract**
- **0. Introduction**
  - 0.1 Where TGP Runs
  - 0.2 Relationship to x402
  - 0.3 Design Principles
- **1. Architecture**
  - 1.1 Network Topology
  - 1.2 Gateway Functions
  - 1.3 Message Flow
- **2. Message Types**
  - 2.1 QUERY
  - 2.2 ADVERT
  - 2.3 SELECT
  - 2.4 LOCKED
  - 2.5 PROOF
  - 2.6 SETTLE
  - 2.7 ERROR
- **3. State Machine**
- **4. Security Considerations**
  - 4.1 Authentication
  - 4.2 HTLC Safety
  - 4.3 Denial of Service
  - 4.4 Privacy
- **5. Attribute Registry**
- **6. x402 Integration**
  - 6.1 `transaction-path` Header
  - 6.2 TDR Logging
- **7. Example Flows**
- **8. Future Extensions**
- **9. References**
- **10. The 11-Layer Trust Stack (Informative)**
- **11. TGP L8/L9/L10 Info Block (TIB) — Normative**
  - 11.1 Top-Level Structure
  - 11.2 Endpoint Handles (EH) & Wallet Binding
  - 11.3 Message Verbs Using TIB
  - 11.4 TLV/CBOR Notes
- **12. Policy Expression Language (PEL-0.1) — Normative**
  - 12.1 Evaluation Order
  - 12.2 Minimal Dialect
  - 12.3 Deterministic Policy Hash
- **13. State Summary Objects (SSO) & Quote Anti-Spam — Normative**
  - 13.1 SSO Format & Validity
  - 13.2 QUOTE Preconditions
  - 13.3 Micro-Bonds & Rate Limits
- **14. Receipts & TDR Triplet — Normative**
  - 14.1 Receipt Construction
  - 14.2 TDR Keys
- **Appendix A: Extensible Settlement Mechanisms (Informative)**
- **Appendix B: Terminology**
- **Appendix C: Revision History**

—

## Abstract

The **Transaction Gateway Protocol (TGP)** is an application-layer, path-vector routing protocol for discovering, negotiating, and settling value transfers across trust boundaries. TGP utilizes x402 and standardizes how **value (L8), identity (L9), and policy (L10)** are advertised, negotiated, and enforced end-to-end, enabling atomic multi-hop settlement (e.g., via HTLCs) with verifiable receipts and audit-grade TDRs.

TGP provides:
- **Path discovery** and advertisement with multi-attribute cost, risk, and compliance
- **Quote & select** negotiation bound to ledger **state summaries**
- **Atomic settlement** through cryptographic locks and proofs
- **Policy enforcement** at trust boundaries (Layer 10) using **Endpoint Handles (EH)** and wallet bindings
- **Extensible registry** for domain-specific attributes and policy dialects

—

## 0. Introduction

### 0.1 Where TGP Runs

TGP operates at **trust boundaries**—the edges where:
- Administrative domains meet (org A ↔ org B)  
- Economic policies differ (free tier ↔ paid tier)  
- Risk profiles change (low-trust ↔ high-compliance)  
- Agentic systems coordinate across ownership boundaries

Unlike BGP (packets) or OSPF (intra-domain), TGP routes **value paths**—sequences of commitments that enable atomic multi-hop transfers without trusting intermediaries.

### 0.2 Relationship to x402

**x402**: transport & signaling (QUIC/mTLS), session framing, TDR logging.  
**TGP**: the economic routing layer that carries **L8/L9/L10** info:

- Path advertisement (`ADVERT`)
- Quote request/response (`QUERY` / `ADVERT` with quotes)
- Path selection and lock (`SELECT` / `LOCKED`)
- Settlement coordination (`PROOF` / `SETTLE`)

x402’s `transaction-path` header correlates service delivery with TGP state.

### 0.3 Design Principles

1. **Trust isolation:** Each gateway enforces local policy; no global trust required.  
2. **Atomic settlement:** All-or-nothing transfer across multiple hops.  
3. **Path-vector routing:** Advertise capabilities without exposing topology.  
4. **Policy enforcement:** Validate compliance, rate limits, and risk thresholds.  
5. **Extensibility:** Attribute and policy registries for domain specifics.  
6. **Auditability:** Signed adverts and TDRs; deterministic receipts.  
7. **Privacy by default:** Upstream uses **handles**; wallets only at last hop.  
8. **State-bounded quotes:** Quotes are bound to **State Summary Objects (SSOs)**.

—

## 1. Architecture

### 1.1 Network Topology

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Domain A   │◄───────►│  Gateway 1  │◄───────►│  Gateway 2  │
│  (Client)   │  mTLS   │ (Boundary)  │  mTLS   │ (Boundary)  │
└─────────────┘         └─────────────┘         └─────────────┘
                              │                       │
                              │ TGP Peering          │
                              ▼                       ▼
                        ┌─────────────┐         ┌─────────────┐
                        │  Domain B   │◄───────►│  Domain C   │
                        │  (Provider) │  mTLS   │  (Provider) │
                        └─────────────┘         └─────────────┘
```

### 1.2 Gateway Functions

- **Settlement management:** Create, lock, and settle transfers using declared escrow mechanisms.  
- **Policy enforcement:** Validate compliance, rate limits, and risk thresholds (L10).  
- **Message routing:** Forward queries and adverts between peered domains.  
- **Settlement coordination:** Manage lock/unlock/refund lifecycle atomically.  
- **Identity mediation:** Resolve **Endpoint Handles (EH)** to wallets only at authorized hops (L9).  
- **State bounding:** Bind quotes/locks to **SSOs** (L8).

### 1.3 Message Flow

```
Client ──► Gateway A ──► Gateway B ──► Provider
   │           │            │             │
   │ QUERY     │  ADVERT    │  ADVERT     │
   │◄──────────┤◄───────────┤◄────────────┤
   │           │            │             │
   │ SELECT    │  SELECT    │  SELECT     │
   ├──────────►├───────────►├────────────►│
   │           │            │             │
   │ (service delivery via x402)          │
   │◄─────────────────────────────────────┤
   │           │            │             │
   │ PROOF     │  PROOF     │  PROOF      │
   ├──────────►├───────────►├────────────►│
   │           │            │             │
   │ SETTLE    │  SETTLE    │  SETTLE     │
   │◄──────────┤◄───────────┤◄────────────┤
```

—

## 2. Message Types

All TGP messages are JSON objects with common fields:

```json
{
  “vgp_version”: “0.1”,
  “message_type”: “QUERY | ADVERT | SELECT | LOCKED | PROOF | SETTLE | ERROR”,
  “request_id”: “uuid-v4”,
  “timestamp”: “ISO-8601”,
  “sender”: “domain-id”,
  “signature”: “ed25519-signature”
}
```

### 2.1 QUERY

```json
{
  “message_type”: “QUERY”,
  “request_id”: “req-123”,
  “sender”: “client.example”,
  “destination”: “provider.example”,
  “attributes”: {
    “amount”: {“value”: 100, “currency”: “USD”},
    “deadline”: “2025-12-01T12:00:00Z”,
    “compliance”: [“KYC”, “AML”],
    “qos”: {“latency_ms”: 500, “reliability”: 0.99}
  }
}
```

### 2.2 ADVERT

```json
{
  “message_type”: “ADVERT”,
  “request_id”: “req-123”,
  “sender”: “gateway-a.example”,
  “paths”: [
    {
      “path_id”: “path-1”,
      “hops”: [“gateway-a.example”, “gateway-b.example”],
      “cost”: {“base”: 1.50, “variable”: 0.02, “currency”: “USD”},
      “risk_score”: 0.05,
      “attributes”: {
        “escrow_type”: “htlc”,
        “settlement_time_max”: 300,
        “compliance”: [“KYC”]
      }
    }
  ],
  “ttl”: 60
}
```

### 2.3 SELECT

```json
{
  “message_type”: “SELECT”,
  “request_id”: “req-123”,
  “sender”: “client.example”,
  “path_id”: “path-1”,
  “htlc_params”: {
    “hash”: “sha256-of-secret”,
    “timeout”: “2025-12-01T12:05:00Z”,
    “amount”: 101.50
  }
}
```

### 2.4 LOCKED

```json
{
  “message_type”: “LOCKED”,
  “request_id”: “req-123”,
  “sender”: “gateway-a.example”,
  “path_id”: “path-1”,
  “htlc_id”: “htlc-456”,
  “status”: “LOCKED”
}
```

### 2.5 PROOF

```json
{
  “message_type”: “PROOF”,
  “request_id”: “req-123”,
  “sender”: “provider.example”,
  “htlc_secret”: “preimage-of-hash”,
  “proof_data”: {
    “tdr_hash”: “sha256-of-tdr”,
    “signature”: “provider-signature”
  }
}
```

### 2.6 SETTLE

```json
{
  “message_type”: “SETTLE”,
  “request_id”: “req-123”,
  “sender”: “gateway-a.example”,
  “htlc_id”: “htlc-456”,
  “status”: “SETTLED”,
  “final_amount”: 101.50
}
```

### 2.7 ERROR

```json
{
  “message_type”: “ERROR”,
  “request_id”: “req-123”,
  “sender”: “gateway-b.example”,
  “error_code”: “HTLC_TIMEOUT”,
  “description”: “HTLC expired before proof received”
}
```

—

## 3. State Machine

```
DISCOVER ──► QUOTED ──► SELECTED ──► LOCKED ──► SERVING
                                        │
                                        ▼
                                     PROVED ──► SETTLED ──► CLOSED
                                        │
                                        ▼
                                    (timeout)
                                        │
                                        ▼
                                     REFUNDED ──► CLOSED
```

**State Descriptions:** as in prior draft (unchanged).

—

## 4. Security Considerations

### 4.1 Authentication
- All messages signed with sender’s private key (Ed25519)
- mTLS for transport-layer encryption
- Domain identity verified via DNS/PKI

### 4.2 HTLC Safety
- Atomicity via preimage reveal
- Timeout refund safety
- SHA-256 preimage resistance

### 4.3 Denial of Service
- Rate limiting on `QUERY`
- TTL on `ADVERT`
- Max path length

### 4.4 Privacy
- Path-vector design hides topology
- Encrypted TDRs
- **Handle-only upstream** (see §11.2)

—

## 5. Attribute Registry

| Attribute | Type | Description |
|————|——|-————|
| `amount` | object | `{value, currency}` |
| `compliance` | array | `[“KYC”, “AML”, “GDPR”]` |
| `qos.latency_ms` | int | Max latency per hop |
| `qos.reliability` | float | Success rate (0–1) |
| `escrow_type` | string | `”htlc”`, `”escrow”`, `”direct”` |
| `risk_score` | float | Failure probability |
| `settlement_time_max` | int | Seconds to finalize |

New attributes MAY be proposed via GitHub issue.

—

## 6. x402 Integration

### 6.1 `transaction-path` Header

```
transaction-path: request_id=req-123; path_id=path-1; settlement_id=settle-456; status=LOCKED
```

### 6.2 TDR Logging

Each hop logs negotiation, lock/settle transitions, service delivery correlation, and finalization.

—

## 7. Example Flows

See [`/examples/three-domain-flow.md`].

—

## 8. Future Extensions

- Multi-currency routing  
- Reputation systems  
- Privacy enhancements (ZK)  
- Dynamic repricing during `SERVING`

—

## 9. References

- **x402 Protocol:** Ledger of Earth x402 Spec  
- **HTLC Overview:** Bitcoin Wiki — HTLC  
- **BGP RFC 4271:** Path-vector routing

—

## 10. The 11-Layer Trust Stack (Informative)

This model extends OSI into economic trust:

| Layer | Name | Classical Analogue | Description |
|——|——|———————|-————|
| L1 | Physical | Fiber/Copper/RF | Signal transmission. |
| L2 | Data Link | Ethernet/PPP | Reliable neighbor link. |
| L3 | Network | IP/BGP | Routing across domains. |
| L4 | Transport | TCP/UDP | End-to-end flow control. |
| L5 | Session | SIP/TLS handshake | Agent session setup. |
| L6 | Presentation | ASN.1/JSON/TLS | Encoding, crypto, proofs. |
| L7 | Application | HTTP/SIP/DNS | Networked APIs. |
| **L8** | **Database of Transactions** | — | Distributed ledgers, state proofs, escrow contracts. |
| **L9** | **Identity** | — | DIDs, EH handles, wallet bindings, attestations. |
| **L10** | **Policy** | — | Permissions, fees, jurisdictions, QoS, compliance. |
| **L11** | **DApp/Intent** | — | Business logic: DAOs, markets, agents. |

Heuristics: **L1–L7 move bits; L8–L10 move value under rules; L11 explains intent.**

—

## 11. TGP L8/L9/L10 Info Block (TIB) — Normative

A compact structure carried in TGP messages (JSON or CBOR/TLV) to bind **value (L8)**, **identity (L9)**, and **policy (L10)** to a quote, ticket, or settlement.

### 11.1 Top-Level Structure

```json
{
  “meta”: {
    “v”: 1,
    “nonce”: “128-bit-hex”,
    “exp”: 1762147200000,
    “trace_id”: “uuid-v4”
  },
  “l8_value”: {
    “network”: { “family”: “EVM|UTXO|Solana|...”, “chain_id”: 369, “endpoint_class”: “full|archive|light” },
    “asset”: { “symbol”: “USDC”, “address”: “0x...”, “decimals”: 6 },
    “state_summaries”: [“sso-id-1”,”sso-id-2”],
    “state_refs?”: [{ “type”: “block_header”, “height”: 23456789, “hash”: “0x...” }],
    “amount”: “1250.00”,
    “settlement”: { “mode”: “immediate|escrow|invoice”, “timelock_ms”: 180000, “escrow_contract?”: “0x...” },
    “price_oracle?”: { “id”: “chainlink:USDCUSD”, “tolerance_bps”: 50 }
  },
  “l9_identity”: {
    “entities”: {
      “initiator”: “did:loe:dbigge”,
      “payer”: { “handle”: “eh:tbca:...”, “proofs”: [“sig:...”,”zk:addr_ownership”] },
      “payee”: { “handle”: “eh:tbcz:...”, “proofs”: [“attest:...”] },
      “mediators?”: [“as12345”, “auditor.example”]
    },
    “bindings”: [
      { “handle”: “eh:tbca:...”, “can_settle_on”: [“evm:0xAA...”], “proof”: “sig-or-zk” }
    ],
    “vc_refs?”: [“sd-jwt:...”, “vc:jwt:...”]
  },
  “l10_policy”: {
    “roles”: [
      { “role”: “initiator”, “entity”: “did:loe:dbigge”, “rights”: [“quote”,”commit”] },
      { “role”: “router”, “entity”: “as12345”, “rights”: [“route”,”settle”] }
    ],
    “rules”: { “allow_networks”: [{“family”:”EVM”,”chain_id”:369}], “deny_jurisdictions”: [“RU”], “fee_split”: {“network_fees”:”payer”,”service_fees”:”split:70/30”}, “caps”: {“max_total_usd”:”2000”,”max_fee_usd”:”5”}, “qos”: {“max_latency_ms”:800,”min_success_rate”:0.99} },
    “compliance”: [“OFAC:US-2025-10”],
    “audit”: { “tdr_level”: “summary|full”, “log_sink”: “syslog://tbc.local:514” }
  },
  “crypto”: { “enc”: [“hpke:X25519”], “sig”: “base64(ed25519(sig over canonical TIB))” }
}
```

**Norms:**
- `meta.nonce` + `meta.exp` required for anti-replay; peers cache `(trace_id, nonce)` within window.  
- `crypto.sig` is **required** by the initiator on QUOTE/SELECT/COMMIT/SETTLE envelopes.  
- `l8_value.state_summaries` are **required** on QUOTE/ADVERT (see §13).  
- `l8_value.state_refs` become **required** at COMMIT/SETTLE.

### 11.2 Endpoint Handles (EH) & Wallet Binding

- Upstream hops MUST use **Endpoint Handles** (`eh:*`) rather than raw wallet addresses.  
- Last authorized hop MAY resolve EH→wallet if policy allows.  
- Bindings MUST be proven by signature or ZK ownership proofs.  
- Clear-text upstream wallet disclosure is **prohibited**.

### 11.3 Message Verbs Using TIB

- `PRECHECK` (optional fast-fail): `l9_identity` + `l10_policy` only.  
- `QUERY/ADVERT`: include **TIB** with `state_summaries`; quotes are bound to SSO ids.  
- `SELECT/LOCKED`: include **TIB**; `policy_hash` from §12.3 MUST include SSO ids.  
- `PROOF/SETTLE`: include **TIB** with `state_refs` + settlement txids.

### 11.4 TLV/CBOR Notes

Recommended TLVs:  
`0xA0` VERSION, `0xA1` NONCE, `0xA2` EXPIRY, `0xA3` TRACE_ID,  
`0xC8` L8-VALUE, `0xC9` L9-IDENTITY, `0xCA` L10-POLICY,  
`0xF0` CRYPTO, `0xFF` MAC.

Unknown non-critical TLVs MAY be ignored; unknown critical TLVs MUST cause `ERROR.unsupported`.

—

## 12. Policy Expression Language (PEL-0.1) — Normative

A minimal, deterministic policy grammar for L10.

### 12.1 Evaluation Order

**deny → caps → allow → qos → fees** (strict).  
Policies MUST be pure and side-effect-free.

### 12.2 Minimal Dialect

```json
{
  “allow_networks”: [{“family”:”EVM”,”chain_id”:369}],
  “deny_jurisdictions”: [“RU”],
  “caps”: {“max_total_usd”:”2000”,”max_fee_usd”:”5”},
  “fee_split”: {“network_fees”:”payer”,”service_fees”:”split:70/30”},
  “qos”: {“max_latency_ms”:800,”min_success_rate”:0.99}
}
```

### 12.3 Deterministic Policy Hash

`policy_hash = H( canonical_json(policy) || join(sorted(SSO_ids)) )`  
All quotes, tickets, and settlements MUST carry `policy_hash`.

—

## 13. State Summary Objects (SSO) & Quote Anti-Spam — Normative

### 13.1 SSO Format & Validity

`SSO` is a signed, cacheable summary of ledger state:

```json
{
  “sso_id”: “uuid”,
  “chain_id”: 369,
  “height”: 23456789,
  “midprices?”: {“USDCUSD”:”1.0002”},
  “gas_quote?”: {“max_gwei”:”5”},
  “liquidity_caps?”: {“USDC”:”$50,000”},
  “valid_ms”: 60000,
  “issuer”: “gateway-a.example”,
  “sig”: “ed25519(signature)”
}
```

- Gateways MAY trust local or federated SSO issuers.  
- SSOs expire at `now + valid_ms`.

### 13.2 QUOTE Preconditions

- `QUERY/ADVERT` MUST reference one or more current `SSO_ids`.  
- `SELECT/LOCKED` MUST carry same `SSO_ids`; otherwise `ERROR.SSO_MISMATCH`.  
- `COMMIT/SETTLE` MUST include concrete `state_refs` matching or exceeding SSO height.

### 13.3 Micro-Bonds & Rate Limits

To mitigate quote-floods:
- Gateways MAY require a **quote-bond** (refundable or fee-credit) announced in `ADVERT`.  
- Gateways SHOULD enforce **per-sender** rate-limits and moving-window quotas.  
- Violations MAY return `ERROR.RATE_LIMIT` or `ERROR.BOND_REQUIRED`.

—

## 14. Receipts & TDR Triplet — Normative

### 14.1 Receipt Construction

A valid receipt MUST commit to **all three**:

```
receipt_hash = H( L8_settlement_proofs || L9_bindings || L10_policy_hash )
```

- Without the triplet, the receipt is invalid.

### 14.2 TDR Keys

Gateways MUST log at least:

```
ts, trace_id, verb, result, l8.family, l8.chain_id,
asset.symbol, amount, txid?, route_asn?, policy_hash, sso_ids, error_code?
```

—

## Appendix A: Extensible Settlement Mechanisms (Informative)

### A.1 Common Settlement Mechanisms
- **HTLCs**
- **State Channels**
- **ZK-Attested Transfers**
- **Custodial Escrow**

### A.2 Implementation Guidance: Economic NAT (E-NAT)
- Border wallets, policy engines, domain mapping, compliance choke points.

### A.3 Reference Implementations
- Multisig ops, rate limiting, automated screening, TDR retention, declared `escrow_type`.

—

## Appendix B: Terminology

*(As in prior draft; unchanged.)*

—

## Appendix C: Revision History

| Version | Date | Changes |
|———|——|———|
| 0.1-draft | 2025-01 | Initial public draft |
| 0.1-draft | 2025-11 | Added L8/L9/L10 TIB, PEL-0.1, SSOs, receipts, and 11-layer model; updated TOC and intro |

—

**Maintainer:** Ledger of Earth  
**Contact:** vgp@ledgerofearth.org  
**Repository:** https://github.com/ledgerofearth/vgp


—

## Appendix D: Deprecation Note

> **Renaming Notice (2025-11)**  
> The protocol previously designated **Value Gateway Protocol (VGP)** has been formally renamed to **Transaction Gateway Protocol (TGP)** to better represent its generalized function as a **transaction routing and negotiation protocol** applicable across financial, AI, and carrier-grade infrastructure.  
> 
> - All references to `VGP` in earlier documents are equivalent to `TGP`.  
> - The `TIB` (Transaction Info Block) supersedes the `VIB` definition.  
> - Implementations SHOULD migrate to `TGP-00` or later versions.  
> - The `transaction-path` header replaces the earlier `value-path` header in x402 integrations.  

**Maintainer:** Ledger of Earth  
**Contact:** tgp@ledgerofearth.org  
**Repository:** https://github.com/ledgerofearth/tgp
