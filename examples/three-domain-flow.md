# Three-Domain Flow Example

This example demonstrates a complete VGP transaction across three administrative domains:

- **Domain A (Client):** Requests a service
- **Domain B (Gateway):** Intermediary routing domain
- **Domain C (Provider):** Service provider

---

## Scenario

**Client A** wants to process 100 API requests through **Provider C**, but:
- Client A has no direct relationship with Provider C
- Gateway B has peering agreements with both A and C
- Payment must be atomic (no funds lost if service fails)

**Goal:** Route request through Gateway B, with HTLC-based settlement.

---

## Step 1: Path Discovery

### Client A → Gateway B (QUERY)

```json
{
  "tgp_version": "0.1",
  "message_type": "QUERY",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:00Z",
  "sender": "client-a.example.com",
  "destination": "provider-c.example.com",
  "attributes": {
    "amount": {"value": 10.00, "currency": "USDC"},
    "deadline": "2025-12-01T10:05:00Z",
    "qos": {"latency_ms": 500, "reliability": 0.99},
    "compliance": ["KYC"]
  },
  "signature": "ed25519-sig-client-a"
}
```

### Gateway B → Provider C (QUERY Forwarding)

Gateway B forwards the query to Provider C (with its own signature):

```json
{
  "tgp_version": "0.1",
  "message_type": "QUERY",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:01Z",
  "sender": "gateway-b.example.com",
  "destination": "provider-c.example.com",
  "attributes": {
    "amount": {"value": 9.50, "currency": "USDC"},
    "deadline": "2025-12-01T10:05:00Z",
    "qos": {"latency_ms": 400, "reliability": 0.99},
    "compliance": ["KYC"]
  },
  "signature": "ed25519-sig-gateway-b"
}
```

Note: Gateway B takes a $0.50 fee, so downstream amount is reduced.

---

## Step 2: Path Advertisement

### Provider C → Gateway B (ADVERT)

```json
{
  "tgp_version": "0.1",
  "message_type": "ADVERT",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:02Z",
  "sender": "provider-c.example.com",
  "paths": [
    {
      "path_id": "path-direct-c",
      "hops": ["provider-c.example.com"],
      "cost": {"base": 8.00, "variable": 0.01, "currency": "USDC"},
      "risk_score": 0.01,
      "attributes": {
        "escrow_type": "htlc",
        "settlement_time_max": 120,
        "compliance": ["KYC"]
      }
    }
  ],
  "ttl": 60,
  "signature": "ed25519-sig-provider-c"
}
```

### Gateway B → Client A (ADVERT with B's hop added)

```json
{
  "tgp_version": "0.1",
  "message_type": "ADVERT",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:03Z",
  "sender": "gateway-b.example.com",
  "paths": [
    {
      "path_id": "path-via-b",
      "hops": ["gateway-b.example.com", "provider-c.example.com"],
      "cost": {"base": 10.00, "variable": 0.02, "currency": "USDC"},
      "risk_score": 0.02,
      "attributes": {
        "escrow_type": "htlc",
        "settlement_time_max": 180,
        "compliance": ["KYC"]
      }
    }
  ],
  "ttl": 60,
  "signature": "ed25519-sig-gateway-b"
}
```

Client A now knows:
- Total cost: $10.00
- Path: Client A → Gateway B → Provider C
- Settlement time: Max 180 seconds

---

## Step 3: Path Selection & HTLC Locking

### Client A → Gateway B (SELECT)

```json
{
  "tgp_version": "0.1",
  "message_type": "SELECT",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:05Z",
  "sender": "client-a.example.com",
  "path_id": "path-via-b",
  "htlc_params": {
    "hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "timeout": "2025-12-01T10:05:00Z",
    "amount": 10.00
  },
  "signature": "ed25519-sig-client-a"
}
```

**HTLC Details:**
- **Hash:** SHA-256 of secret preimage (only Provider C knows the preimage initially)
- **Timeout:** 5 minutes from now
- **Amount:** $10.00 locked in Client A's E-NAT wallet

### Gateway B → Provider C (SELECT Forwarding)

```json
{
  "tgp_version": "0.1",
  "message_type": "SELECT",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:06Z",
  "sender": "gateway-b.example.com",
  "path_id": "path-direct-c",
  "htlc_params": {
    "hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "timeout": "2025-12-01T10:04:30Z",
    "amount": 9.50
  },
  "signature": "ed25519-sig-gateway-b"
}
```

**Gateway B's HTLC:**
- Same hash (ensures atomicity)
- Earlier timeout (30s buffer to propagate unlock)
- Reduced amount ($9.50 — Gateway B keeps $0.50 fee)

---

## Step 4: HTLC Lock Confirmation

### Provider C → Gateway B (LOCKED)

```json
{
  "tgp_version": "0.1",
  "message_type": "LOCKED",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:07Z",
  "sender": "provider-c.example.com",
  "path_id": "path-direct-c",
  "htlc_id": "htlc-c-12345",
  "status": "LOCKED",
  "signature": "ed25519-sig-provider-c"
}
```

### Gateway B → Client A (LOCKED)

```json
{
  "tgp_version": "0.1",
  "message_type": "LOCKED",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:08Z",
  "sender": "gateway-b.example.com",
  "path_id": "path-via-b",
  "htlc_id": "htlc-b-67890",
  "status": "LOCKED",
  "signature": "ed25519-sig-gateway-b"
}
```

**State:** All HTLCs locked. Service delivery can now begin.

---

## Step 5: Service Delivery (via x402)

Client A sends x402 request with VGP metadata:

```
POST /api/process HTTP/1.1
Host: provider-c.example.com
htlc-path: request_id=req-abc-123; path_id=path-via-b; htlc_id=htlc-b-67890; status=LOCKED
Content-Type: application/json

{"data": "..."}
```

Provider C processes request and logs TDR (Transaction Detail Record):

```json
{
  "tdr_id": "tdr-789",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:30Z",
  "service": "api-processing",
  "status": "success",
  "hash": "sha256:abcdef...",
  "signature": "ed25519-sig-provider-c"
}
```

---

## Step 6: Proof Submission

### Provider C → Gateway B (PROOF)

```json
{
  "tgp_version": "0.1",
  "message_type": "PROOF",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:31Z",
  "sender": "provider-c.example.com",
  "htlc_secret": "preimage-secret-xyz",
  "proof_data": {
    "tdr_hash": "sha256:abcdef...",
    "signature": "ed25519-sig-provider-c"
  },
  "signature": "ed25519-sig-provider-c"
}
```

**Critical:** Provider C reveals `htlc_secret` (preimage of hash). This unlocks all HTLCs in the path.

### Gateway B → Client A (PROOF Forwarding)

```json
{
  "tgp_version": "0.1",
  "message_type": "PROOF",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:32Z",
  "sender": "gateway-b.example.com",
  "htlc_secret": "preimage-secret-xyz",
  "proof_data": {
    "tdr_hash": "sha256:abcdef...",
    "signature": "ed25519-sig-provider-c"
  },
  "signature": "ed25519-sig-gateway-b"
}
```

---

## Step 7: Settlement

### Gateway B Unlocks HTLCs

1. **Gateway B → Provider C (SETTLE)**

```json
{
  "tgp_version": "0.1",
  "message_type": "SETTLE",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:33Z",
  "sender": "gateway-b.example.com",
  "htlc_id": "htlc-c-12345",
  "status": "SETTLED",
  "final_amount": 9.50,
  "signature": "ed25519-sig-gateway-b"
}
```

Provider C receives $9.50.

2. **Gateway B → Client A (SETTLE)**

```json
{
  "tgp_version": "0.1",
  "message_type": "SETTLE",
  "request_id": "req-abc-123",
  "timestamp": "2025-12-01T10:00:34Z",
  "sender": "gateway-b.example.com",
  "htlc_id": "htlc-b-67890",
  "status": "SETTLED",
  "final_amount": 10.00,
  "signature": "ed25519-sig-gateway-b"
}
```

Client A's $10.00 HTLC is unlocked, $0.50 retained by Gateway B as fee.

---

## Step 8: Request Closure

All parties update state to `CLOSED`. Transaction complete.

**Final Balances:**
- Client A: Paid $10.00
- Gateway B: Earned $0.50 (fee)
- Provider C: Earned $9.50

**Guarantees:**
- ✅ **Atomicity:** All parties paid simultaneously (secret reveal triggers cascade)
- ✅ **No counterparty risk:** HTLCs ensure refund if service not delivered
- ✅ **Auditability:** TDR logs prove service delivery
- ✅ **Privacy:** Internal topology of B and C not exposed to Client A

---

## Failure Scenarios

### Scenario 1: Provider C Fails to Deliver

If Provider C doesn't submit `PROOF` before timeout:
- HTLCs expire and refund automatically
- Client A gets $10.00 back
- Gateway B gets $9.50 back (no fee earned)
- Provider C gets nothing

### Scenario 2: Network Partition

If Gateway B disconnects mid-flow:
- Client A's HTLC times out → refund
- Provider C's HTLC times out → refund
- No funds lost (time-locks ensure safety)

### Scenario 3: Dishonest Gateway

If Gateway B tries to keep both fees and not pay Provider C:
- Provider C holds the secret, doesn't reveal it
- HTLCs expire, all parties refunded
- Gateway B earns nothing (punishment for dishonesty)

---

## Summary

This example demonstrates VGP's core properties:
1. **Multi-hop routing** with transparent cost accumulation
2. **Atomic settlement** via cryptographic HTLCs
3. **Trust isolation** (no global trust required)
4. **Failure safety** (timeouts prevent lock-up)

See [`/specs/TGP-00.md`](../specs/TGP-00.md) for full protocol details.
