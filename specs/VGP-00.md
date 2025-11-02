# Value Gateway Protocol (VGP-00)

**Version:** 0.1-draft  
**Status:** Draft  
**Published:** 2025  
**Organization:** Ledger of Earth

---

## Abstract

The **Value Gateway Protocol (VGP)** is an application-layer, path-vector routing protocol for discovering, negotiating, and settling value transfers across trust boundaries. VGP operates above the x402 protocol layer, enabling administrative or economic domains with differing policies to exchange value atomically using Hashed Time-Locked Contracts (HTLCs).

VGP provides:
- **Path discovery** and advertisement across peering gateways
- **Quote negotiation** with multi-attribute cost/risk/compliance metadata
- **Atomic settlement** through cryptographic locks and proofs
- **Policy enforcement** at trust boundaries via E-NAT wallets
- **Extensible attribute registry** for domain-specific requirements

---

## 0. Introduction

### 0.1 Where VGP Runs

VGP operates at **trust boundaries** — the edges where:
- Administrative domains meet (org A ↔ org B)
- Economic policies differ (free tier ↔ paid tier)
- Risk profiles change (low-trust ↔ high-compliance zones)
- Agentic systems coordinate across ownership boundaries

Unlike BGP (which routes packets) or OSPF (which routes within domains), VGP routes **value paths** — sequences of locked commitments that enable atomic multi-hop transfers without requiring trust between intermediate parties.

### 0.2 Relationship to x402

**x402** provides the transport and signaling layer:
- Session establishment (QUIC/mTLS)
- Message framing and multiplexing
- TDR (Transaction Detail Record) logging
- Proof-of-value verification

**VGP** provides the economic routing layer:
- Path advertisement (`ADVERT` messages)
- Quote request/response (`QUERY` / `QUOTED`)
- Path selection and locking (`SELECT` / `LOCKED`)
- Settlement coordination (`PROOF` / `SETTLE`)

x402's proposed **`htlc-path`** header extension carries VGP state across hops.

### 0.3 Design Principles

1. **Trust isolation:** Each gateway enforces local policy; no global trust required
2. **Atomic settlement:** HTLCs ensure all-or-nothing value transfer
3. **Path vector routing:** Advertise capabilities without exposing internal topology
4. **Policy enforcement:** Gateways validate compliance, rate limits, and risk thresholds
5. **Extensibility:** Attribute registry allows domain-specific metadata
6. **Auditability:** Signed adverts and TDR logs enable compliance verification

---

## 1. Architecture

### 1.1 Network Topology

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Domain A   │◄───────►│  Gateway 1  │◄───────►│  Gateway 2  │
│  (Client)   │  mTLS   │ (Boundary)  │  mTLS   │ (Boundary)  │
└─────────────┘         └─────────────┘         └─────────────┘
                              │                       │
                              │ VGP Peering          │
                              ▼                       ▼
                        ┌─────────────┐         ┌─────────────┐
                        │  Domain B   │◄───────►│  Domain C   │
                        │  (Provider) │  mTLS   │  (Provider) │
                        └─────────────┘         └─────────────┘
```

### 1.2 Gateway Functions

VGP gateways perform the following functions:
- **HTLC management:** Create, lock, and settle cross-domain value transfers
- **Policy enforcement:** Validate compliance requirements, rate limits, and risk thresholds
- **Message routing:** Forward queries and adverts between peered domains
- **Settlement coordination:** Manage lock/unlock/refund lifecycle atomically

Gateways isolate internal domain details from external peers while enabling interoperability.

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

---

## 2. Message Types

All VGP messages are JSON objects with common fields:

```json
{
  "vgp_version": "0.1",
  "message_type": "QUERY | ADVERT | SELECT | LOCKED | PROOF | SETTLE | ERROR",
  "request_id": "uuid-v4",
  "timestamp": "ISO-8601",
  "sender": "domain-id",
  "signature": "ed25519-signature"
}
```

### 2.1 QUERY

Client requests quotes for a value transfer.

```json
{
  "message_type": "QUERY",
  "request_id": "req-123",
  "sender": "client.example",
  "destination": "provider.example",
  "attributes": {
    "amount": {"value": 100, "currency": "USD"},
    "deadline": "2025-12-01T12:00:00Z",
    "compliance": ["KYC", "AML"],
    "qos": {"latency_ms": 500, "reliability": 0.99}
  }
}
```

### 2.2 ADVERT

Gateway advertises available paths and costs.

```json
{
  "message_type": "ADVERT",
  "request_id": "req-123",
  "sender": "gateway-a.example",
  "paths": [
    {
      "path_id": "path-1",
      "hops": ["gateway-a.example", "gateway-b.example"],
      "cost": {"base": 1.50, "variable": 0.02, "currency": "USD"},
      "risk_score": 0.05,
      "attributes": {
        "escrow_type": "htlc",
        "settlement_time_max": 300,
        "compliance": ["KYC"]
      }
    }
  ],
  "ttl": 60
}
```

### 2.3 SELECT

Client chooses a path and initiates locking.

```json
{
  "message_type": "SELECT",
  "request_id": "req-123",
  "sender": "client.example",
  "path_id": "path-1",
  "htlc_params": {
    "hash": "sha256-of-secret",
    "timeout": "2025-12-01T12:05:00Z",
    "amount": 101.50
  }
}
```

### 2.4 LOCKED

Gateway confirms HTLC is locked.

```json
{
  "message_type": "LOCKED",
  "request_id": "req-123",
  "sender": "gateway-a.example",
  "path_id": "path-1",
  "htlc_id": "htlc-456",
  "status": "LOCKED"
}
```

### 2.5 PROOF

Service provider submits proof of delivery.

```json
{
  "message_type": "PROOF",
  "request_id": "req-123",
  "sender": "provider.example",
  "htlc_secret": "preimage-of-hash",
  "proof_data": {
    "tdr_hash": "sha256-of-tdr",
    "signature": "provider-signature"
  }
}
```

### 2.6 SETTLE

Gateway unlocks HTLC and finalizes settlement.

```json
{
  "message_type": "SETTLE",
  "request_id": "req-123",
  "sender": "gateway-a.example",
  "htlc_id": "htlc-456",
  "status": "SETTLED",
  "final_amount": 101.50
}
```

### 2.7 ERROR

Any party reports protocol violation or failure.

```json
{
  "message_type": "ERROR",
  "request_id": "req-123",
  "sender": "gateway-b.example",
  "error_code": "HTLC_TIMEOUT",
  "description": "HTLC expired before proof received"
}
```

---

## 3. State Machine

Each request follows this lifecycle:

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

**State Descriptions:**

- **DISCOVER:** Client sends `QUERY`, awaits `ADVERT`
- **QUOTED:** Gateway has advertised paths
- **SELECTED:** Client sends `SELECT`, awaits `LOCKED`
- **LOCKED:** HTLCs locked across path
- **SERVING:** Service delivery in progress (via x402)
- **PROVED:** Provider submits `PROOF` with secret
- **SETTLED:** Gateways unlock HTLCs, funds transferred
- **CLOSED:** Request complete
- **REFUNDED:** HTLC timed out, funds returned

---

## 4. Security Considerations

### 4.1 Authentication

- All messages signed with sender's private key (Ed25519)
- mTLS for transport-layer encryption
- Domain identity verified via DNS/PKI

### 4.2 HTLC Safety

- **Atomicity:** Secret reveal triggers all-or-nothing unlock
- **Timeout protection:** Refund after deadline prevents lock-up
- **Hash collision resistance:** SHA-256 preimage secrecy

### 4.3 Denial of Service

- Rate limiting on `QUERY` messages per sender
- TTL on `ADVERT` to prevent stale route pollution
- Maximum path length to prevent loop attacks

### 4.4 Privacy

- Path-vector design hides internal topology
- Encrypted TDR logs for compliance without public exposure
- Zero-knowledge proofs (future extension) for selective disclosure

---

## 5. Attribute Registry

VGP defines extensible attributes for path advertisement:

| Attribute | Type | Description |
|-----------|------|-------------|
| `amount` | object | `{value, currency}` |
| `compliance` | array | `["KYC", "AML", "GDPR"]` |
| `qos.latency_ms` | int | Max latency per hop |
| `qos.reliability` | float | Success rate (0-1) |
| `escrow_type` | string | `"htlc"`, `"escrow"`, `"direct"` |
| `risk_score` | float | Estimated failure probability |
| `settlement_time_max` | int | Seconds to finalize |

New attributes can be proposed via GitHub issue.

---

## 6. x402 Integration

### 6.1 `htlc-path` Header

VGP state is carried in x402's `htlc-path` header:

```
htlc-path: request_id=req-123; path_id=path-1; htlc_id=htlc-456; status=LOCKED
```

This enables:
- x402 routers to log VGP state in TDRs
- Correlation of service delivery with payment status
- Proof-of-value verification at settlement

### 6.2 TDR Logging

Each hop logs:
- `QUERY` / `ADVERT` negotiation
- `SELECT` / `LOCKED` HTLC creation
- Service delivery (x402 request/response)
- `PROOF` / `SETTLE` finalization

TDRs are signed and optionally encrypted for compliance.

---

## 7. Example Flows

See [`/examples/three-domain-flow.md`](../examples/three-domain-flow.md) for detailed scenarios.

---

## 8. Future Extensions

- **Multi-currency routing:** Automatic FX conversion across paths
- **Reputation systems:** Trust scores based on historical performance
- **Privacy enhancements:** Zero-knowledge proofs for compliance
- **Dynamic repricing:** Real-time cost updates during `SERVING` state

---

## 9. References

- **x402 Protocol:** [Ledger of Earth x402 Spec](https://ledgerofearth.org/x402)
- **HTLC Overview:** [Bitcoin Wiki - HTLC](https://en.bitcoin.it/wiki/Hash_Time_Locked_Contracts)
- **BGP RFC 4271:** Path-vector routing inspiration

---

## Appendix A: Implementation Guidance (Informative)

### A.1 Economic NAT (E-NAT)

Implementations **MAY** employ Economic Network Address Translation (E-NAT) or equivalent border-wallet mapping to enforce policy isolation and contain risk. Such systems are out of scope for this specification but are commonly deployed at trust boundaries.

**E-NAT Characteristics (Informative):**
- **Border wallets:** Hold HTLCs for cross-domain transfers, isolating internal liquidity
- **Policy engines:** Enforce rate limits, compliance rules (KYC/AML), and risk scoring
- **Domain mapping:** Enable different internal accounting rails, currencies, or ledgers
- **Compliance choke points:** Provide centralized control for sanctions screening and usage caps

E-NAT is analogous to Network Address Translation (NAT) in IP networks, but operates on economic/value flows rather than packet flows.

### A.2 Reference Implementations

Gateway implementers should consider:
- Multi-signature HTLC wallets for operational security
- Rate limiting per sender/path to prevent abuse
- Automated compliance screening via third-party APIs
- TDR archival policies for audit retention requirements

---

## Appendix B: Terminology

- **Trust boundary:** Interface between administrative/economic domains
- **HTLC:** Hashed Time-Locked Contract
- **TDR:** Transaction Detail Record (x402 audit log)
- **Path vector:** Route advertisement including cost/policy metadata
- **Gateway:** VGP-speaking node at a trust boundary

---

## Appendix C: Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1-draft | 2025-01 | Initial public draft |

---

**Maintainer:** Ledger of Earth  
**Contact:** vgp@ledgerofearth.org  
**Repository:** https://github.com/ledgerofearth/vgp
