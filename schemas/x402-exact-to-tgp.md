# Mapping x402 `exact` (EIP‑3009) onto TGP (Transaction Gateway Protocol)
**Version:** 0.1-draft  
**Status:** Draft  
**Date:** 2025‑11‑03
---
## 1. Purpose
This document shows how to use x402’s `exact` scheme on EVM (via **EIP‑3009** `transferWithAuthorization`) as the payment/settlement primitive for **TGP** (a path‑vector value routing protocol). It defines the headers, verification steps, per‑hop attributes, and multi‑hop settlement flow so a TBC/TGP Gateway can negotiate quotes and atomically settle across trust boundaries without taking custody.
---
## 2. Entities
- **Client (payer)** — The origin that wants a resource/service.
- **Resource Server (RS)** — The provider that receives payment.
- **Facilitator** — A TGP Gateway that validates and broadcasts the settlement on behalf of the RS (no custody).
- **TGP Gateway (GW)** — A path‑vector router that discovers/advertises value paths and quotes across **administrative domains**.
- **Path** — Ordered sequence of GWs (hops) that can carry a payment from Client → RS across policy/compliance boundaries.
---
## 3. Payment primitive (EVM / EIP‑3009)
x402 `exact` on EVM uses **EIP‑3009** to authorize a specific amount of an ERC‑20 to a specific recipient (`to`) within a validity window. The facilitator submits exactly that authorization on‑chain; it **cannot redirect** funds.
### 3.1 X‑PAYMENT header (recap)
```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base-sepolia",
  "payload": {
    "signature": "0x…",
    "authorization": {
      "from": "0x857b…b66",
      "to":   "0x2096…87C",
      "value": "10000",
      "validAfter":  "1740672089",
      "validBefore": "1740672154",
      "nonce": "0xf374…3480"
    }
  }
}
```
**Note:** `authorization.to` **must equal** the RS’s settlement address that appears in the RS’s `paymentRequirements` (advertised via TGP Quote).
---
## 4. TGP data surfaces that reference x402 `exact`
TGP adds *routing/quote* envelopes around the x402 payment primitive.
### 4.1 TGP Path Quote (VPQ)
A VPQ is the unit a GW advertises and passes along during path discovery/negotiation. It’s analogous to a BGP route with policy/price metadata.
```jsonc
{
  "vpqVersion": 1,
  "pathId": "gwA>gwB>gwC",
  "asset": {
    "chain": "base-sepolia",
    "erc20": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "decimals": 6,
    "symbol": "USDC"
  },
  "price": {
    "amount": "10000",
    "currency": "USDC",
    "ttlSeconds": 45
  },
  "fees": [
    {"hop":"gwA","type":"policy_eval","amount":"0"},
    {"hop":"gwB","type":"crossdomain","amount":"25"},
    {"hop":"gwC","type":"egress_settle","amount":"5"}
  ],
  "policy": {
    "kycClass": "P0|P1|P2",
    "jurisdiction": ["US-CA","EU-DE"],
    "sanctions": "OFAC-2025.09",
    "dataRetention": "tdr-90d",
    "allowedUse": ["ai-inference","data-access"]
  },
  "rs": {
    "name": "Example RS",
    "settlementAddress": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
    "paymentRequirements": {
      "scheme": "x402:exact:eip3009",
      "maxAmountRequired": "10000",
      "validityMinSeconds": 30,
      "requiredNetwork": "base-sepolia",
      "requiredToken": "erc20:USDC"
    }
  },
  "nonce": "vpq-7ff5b6b2",
  "sig": "gwC-signature-over-hash"
}
```
**Operational rule:** The Client constructs the `X‑PAYMENT` header using the RS `settlementAddress` and `maxAmountRequired` from the selected VPQ.

### 4.2 TGP Settlement Envelope (VSE)
Carried alongside x402 during final commit so intermediates can verify before allowing the hop.
```jsonc
{
  "vseVersion": 1,
  "pathId": "gwA>gwB>gwC",
  "hopProofs": [
    {"gw":"gwA","proof":"…"},
    {"gw":"gwB","proof":"…"},
    {"gw":"gwC","proof":"…"}
  ],
  "x402": { /* the full X-PAYMENT header, verbatim */ },
  "constraints": {
    "mustSettleBefore": "2025-11-03T08:15:12Z",
    "replayWindowSec": 60
  }
}
```
---
## 5. Verification (Gateway checklist)
Given: a VPQ + X‑PAYMENT + VSE.
1. **Signature validity** — Verify EIP‑3009 signature against `authorization` (domain separator per ERC‑20 contract).
2. **Sufficient balance** — Check `authorization.from` balance ≥ `paymentRequirements.maxAmountRequired`.
3. **Value coverage** — `authorization.value` ≥ `maxAmountRequired`.
4. **Time window** — `now` ∈ [`validAfter`,`validBefore`]. Enforce local skew guard (e.g., ±5 s).
5. **Nonce freshness** — Ensure `authorization.nonce` unused (on‑chain read).
6. **Right contract/chain** — ERC‑20 address and `network` match VPQ/requirements.
7. **Dry‑run** — Simulate `transferWithAuthorization(…)` call to ensure success.
8. **Path conformance** — `pathId` matches plan; check `policy` predicates.
9. **Settlement deadline** — Ensure `validBefore` minus expected latency > minimum.
---
## 6. Multi‑hop settlement algorithm (non‑custodial)
```
Client → gwA → gwB → gwC → RS

1) Discovery:
   RS publishes VPQ (gwC signed) → gwB → gwA → Client.

2) Client prepares X‑PAYMENT:
   EIP‑3009 auth {to=RS.settlementAddress, value=maxAmountRequired}.

3) Commit-intent relay:
   Client sends {VPQ,VSE,X‑PAYMENT} to gwA.
   gwA verifies, adds hopProof_A, forwards to gwB.
   gwB verifies, adds hopProof_B, forwards to gwC.

4) Final settlement:
   gwC verifies + on‑chain call transferWithAuthorization(...).
   On success, gwC issues a Proof‑of‑Settlement (PoS).

5) Back‑propagation:
   gwC → gwB → gwA → Client: deliver PoS and receipt.
```
---
## 7. Receipts & TDR (Telecom‑style) records
### 7.1 Proof‑of‑Settlement (PoS)
```json
{
  "posVersion": 1,
  "txHash": "0x…",
  "blockNumber": 12345678,
  "chainId": 84532,
  "erc20": "0x…USDC",
  "from": "0x857b…b66",
  "to": "0x2096…87C",
  "value": "10000",
  "vpqNonce": "vpq-7ff5b6b2",
  "pathId": "gwA>gwB>gwC",
  "sig": "gwC-signature"
}
```
### 7.2 TDR Flat File Row (example)
```
ts_start,ts_end,client_id,path_id,chain_id,token,amount,tx_hash,block,rs,auth_nonce,rc
2025-11-03T08:14:20Z,2025-11-03T08:14:33Z,c-9b12,gwA>gwB>gwC,84532,USDC,10000,0xabc…def,12345678,0x2096…87C,0xf374…3480,OK
```
---
## 8. Error codes (TGP/x402 boundary)
- `X402.SIG_INVALID`
- `X402.BALANCE_INSUFFICIENT`
- `X402.WINDOW_EXPIRED`
- `X402.NONCE_REUSED`
- `X402.NETWORK_OR_TOKEN_MISMATCH`
- `X402.SIMULATION_FAIL`
- `TGP.POLICY_BLOCKED`
- `TGP.QUOTE_EXPIRED`
- `TGP.HOP_VERIFICATION_FAIL`
- `TGP.FINAL_SETTLEMENT_FAIL`

---
## 9. Security considerations
- **Replay resistance:** Enforce nonce uniqueness and short validity windows; bind `authorization.to` to RS address from VPQ.
- **Time sync:** Gateways should run NTP/PTP; apply skew tolerances conservatively.
- **DoS control:** Rate‑limit simulations; cache VPQs; cap path length.
- **Key hygiene:** Use distinct keys for RS receiving vs. operational control.
- **Compliance:** Attach policy attestations to VPQs; log TDRs immutably (e.g., WORM storage, Merkle‑anchored).

---
## 10. Future: usage‑based with EIP‑2612 + routing contract
1. Client signs **Permit (EIP‑2612)** authorizing a **Routing Contract** for `allowanceMax`.
2. Facilitator calls `permit()` then `transferFrom()` inside the routing contract.
3. The routing contract enforces caps, metering, optional escrow/refunds, and per‑hop fees.

---
## 11. Reference pseudocode (gwC egress)
```go
func SettleExact(xpay XPay, vpq VPQ) (PoS, error) {
  if err := Verify3009(xpay.payload, vpq.rs.paymentRequirements); err != nil { return nil, err }
  sim := eth_call_transferWithAuthorization(xpay.payload)
  if !sim.Success { return nil, ErrSimFail }
  tx := send_transferWithAuthorization(xpay.payload)
  rc := waitReceipt(tx)
  if rc.Status != 1 { return nil, ErrSettle }
  pos := MakePoS(rc, xpay, vpq)
  return pos, nil
}
```
---
## 12. Minimal interop checklist (per implementation)
- [ ] Bind `settlementAddress` → x402 `authorization.to`.
- [ ] Enforce **network/token** match.
- [ ] Run **verification** (Sec.5).
- [ ] Perform **egress settlement** only at final hop.
- [ ] Emit **PoS** and **TDR** rows.
- [ ] Propagate failures with **hop ID** and **reason**.
- [ ] Support **EIP‑2612** (later) for usage‑based flows.

---
## 13. Worked example (Base Sepolia / USDC‑like)
- VPQ: `amount=10000`, `settlementAddress=0x2096…87C`, `network=base-sepolia`.
- Client EIP‑3009: `from=0x857b…b66`, `to=0x2096…87C`, `value=10000`, `validBefore=1740672154`.
- Gateways relay/verify; gwC settles and returns PoS + receipt; TDR logged.

---
## 14. Deprecation/rename note
TGP is being renamed to **TGP: Transaction Gateway Protocol**. Field names are stable for now; future drafts will s/TGP/TGP/ and reserve `tgpVersion` while keeping wire compatibility.
