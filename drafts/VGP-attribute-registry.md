# TGP Attribute Registry

**Status:** Draft  
**Version:** 0.1

---

## Overview

The **TGP Attribute Registry** defines standardized metadata fields that can be included in `QUERY`, `ADVERT`, and path negotiation messages. Attributes enable rich path selection based on cost, quality-of-service, compliance, risk, and domain-specific requirements.

---

## Core Attributes

### Amount
**Type:** Object  
**Required:** Yes (in `QUERY`)

```json
{
  "amount": {
    "value": 100.50,
    "currency": "USD"
  }
}
```

**Description:** Specifies the value being transferred. Currency can be fiat (USD, EUR), crypto (BTC, ETH), or custom units (credits, tokens).

---

### Deadline
**Type:** ISO-8601 timestamp  
**Required:** No

```json
{
  "deadline": "2025-12-01T12:00:00Z"
}
```

**Description:** Latest acceptable completion time. Gateways that cannot meet deadline should not advertise paths.

---

### Compliance
**Type:** Array of strings  
**Required:** No

```json
{
  "compliance": ["KYC", "AML", "GDPR", "SOC2"]
}
```

**Description:** Required regulatory/policy frameworks. Gateways advertise which standards they enforce.

**Standard Values:**
- `KYC` — Know Your Customer identity verification
- `AML` — Anti-Money Laundering checks
- `GDPR` — EU data protection compliance
- `SOC2` — Service Organization Control audit
- `HIPAA` — Healthcare data privacy (US)
- `PCI-DSS` — Payment card security

---

### QoS (Quality of Service)
**Type:** Object  
**Required:** No

```json
{
  "qos": {
    "latency_ms": 500,
    "reliability": 0.99,
    "bandwidth_mbps": 100
  }
}
```

**Fields:**
- `latency_ms` — Maximum acceptable latency per hop
- `reliability` — Minimum success rate (0.0 - 1.0)
- `bandwidth_mbps` — Required throughput (for data-heavy services)

---

### Escrow Type
**Type:** String (enum)  
**Required:** No (defaults to `htlc`)

```json
{
  "escrow_type": "htlc"
}
```

**Standard Values:**
- `htlc` — Hashed Time-Locked Contract (default)
- `state_channel` — Off-chain bilateral payment channel locks
- `trusted_escrow` — Third-party custodian holds funds
- `zk_attested` — Zero-knowledge proof-based settlement
- `smart_contract` — On-chain programmable escrow
- `direct` — No intermediary (high-trust only)

**Description:** Specifies the atomic settlement mechanism used by the gateway. Each mechanism must guarantee all-or-nothing settlement with safe refund semantics. Gateways should declare supported escrow types in their capabilities.

---

### Risk Score
**Type:** Float (0.0 - 1.0)  
**Required:** No

```json
{
  "risk_score": 0.05
}
```

**Description:** Estimated probability of path failure (network issues, policy violations, counterparty default). Lower is better.

---

### Settlement Time
**Type:** Integer (seconds)  
**Required:** No

```json
{
  "settlement_time_max": 300
}
```

**Description:** Maximum time (in seconds) from `PROOF` to `SETTLE`. Critical for high-velocity applications.

---

### Cost Structure
**Type:** Object  
**Required:** Yes (in `ADVERT`)

```json
{
  "cost": {
    "base": 1.50,
    "variable": 0.02,
    "currency": "USD",
    "model": "per_request"
  }
}
```

**Fields:**
- `base` — Fixed cost per transaction
- `variable` — Percentage or per-unit cost
- `currency` — Denomination of cost
- `model` — `per_request`, `per_byte`, `per_second`, `tiered`

---

## Extended Attributes

### Geographic Constraints
**Type:** Array of ISO 3166-1 country codes  
**Required:** No

```json
{
  "geo_allowed": ["US", "CA", "GB"],
  "geo_blocked": ["KP", "IR"]
}
```

**Description:** Legal or policy restrictions on where value can originate/terminate.

---

### Multi-Currency Support
**Type:** Array of objects  
**Required:** No

```json
{
  "currencies": [
    {"code": "USD", "fx_rate": 1.0},
    {"code": "EUR", "fx_rate": 0.85},
    {"code": "BTC", "fx_rate": 0.000023}
  ]
}
```

**Description:** Gateways can advertise support for automatic currency conversion.

---

### Audit Requirements
**Type:** Object  
**Required:** No

```json
{
  "audit": {
    "tdr_retention_days": 90,
    "third_party_verification": true,
    "public_logging": false
  }
}
```

**Description:** Specifies how transaction records are stored and who can access them.

---

### Reputation Metadata
**Type:** Object  
**Required:** No

```json
{
  "reputation": {
    "gateway_score": 0.95,
    "completed_transfers": 10000,
    "dispute_rate": 0.001
  }
}
```

**Description:** Historical performance metrics for gateway trustworthiness.

---

## Proposing New Attributes

To suggest a new attribute:

1. Open a GitHub issue using the [extension-proposal template](../.github/ISSUE_TEMPLATE/extension-proposal.md)
2. Include:
   - **Use case:** Why this attribute is needed
   - **Schema:** JSON structure and types
   - **Security impact:** Privacy or trust implications
   - **Interoperability:** How existing gateways should handle unknown attributes

3. Attributes gain official status through community review and merge to this registry.

---

## Versioning

Attributes follow semantic versioning:
- **Major:** Breaking changes (e.g., renaming fields)
- **Minor:** Additive changes (new optional fields)
- **Patch:** Clarifications or bugfixes

Current version: **0.1.0**

---

## Backward Compatibility

Gateways **MUST** ignore unknown attributes (forward compatibility).  
Clients **SHOULD** validate required attributes are supported before selecting paths.

---

**Maintainer:** Ledger of Earth  
**Contact:** dbigge@ledgerofearth.org
