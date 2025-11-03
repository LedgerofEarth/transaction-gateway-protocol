# Appendix A — TGP‑TAI: Transaction Area Identifiers & Paths

**Spec family:** TGP‑00  
**Appendix:** A (TAI)  
**Version:** 0.1-draft  
**Date:** 2025‑11‑03

---

## A.1 Purpose

This appendix defines **Transaction Areas (TAs)**, **Transaction Area Identifiers (TAIs)**, and the **Transaction Area Path (T‑Path)** used by the **Transaction Gateway Protocol (TGP)** for value‑routing across economic/policy boundaries. Unlike BGP ASNs, TAIs are **self‑asserted cryptographic identities**, requiring **no central registry**.

---

## A.2 Terminology

- **Transaction Area (TA):** An administrative/policy zone governing how value is accepted/forwarded (KYC, jurisdiction, assets, limits).  
- **Transaction Gateway (TG):** A border function that speaks TGP for its TA.  
- **Transaction Area Identifier (TAI):** A cryptographic identifier for a TA.  
- **Transaction Area Path (T‑Path):** Ordered list of TAIs recorded on value route advertisements and quotes.  
- **Policy Root:** Merkle root of the canonical policy corpus that governs a TA during the period of an advertisement.  
- **Attestation:** A signed statement from one TA about another (endorsement, constraints, revocation, etc.).

---

## A.3 Canonical TAI Construction

**Goal:** Collision‑resistant, self‑sovereign identifiers derivable from public data and keys.

**Inputs (normalized):**
```
pubkey        := uncompressed ECDSA secp256k1 public key (65 bytes, 0x04…)
areaName      := UTF‑8 string, NFC normalized, max 96 bytes
policyRoot    := 32‑byte Merkle root (0x…32B)
versionTag    := ASCII "TAI-v1"
```

**Canonical object (CBOR suggested; JSON shown for clarity):**
```json
{
  "version": "TAI-v1",
  "pubkey":  "0x04abcd…",
  "areaName":"Reflexive-Insurance-CA",
  "policyRoot":"0x9341…aa23"
}
```

**Hashing:**
```
taiHash := keccak256( canonical-serialize(object) )
TAI     := "tai:keccak256:" + hex(taiHash)
```

**Notes**
- Implementations **must** canonicalize field order and encodings to avoid hash drift.
- `policyRoot` enables policy‑bound identities; rotating policy implies a new TAI (see A.9).

---

## A.4 Transaction Area Object (TAO)

```json
{
  "tai": "tai:keccak256:7abf92c6…",
  "areaName": "Reflexive-Insurance-CA",
  "pubkey": "0x04a7…efb9",
  "policyRoot": "0x9341…aa23",
  "capabilities": {
    "settlement": ["eip-3009", "eip-2612"],
    "features": ["zkp.reveal-min", "qres.toggle", "tdr.worm"]
  },
  "attestations": [
    {
      "from": "tai:keccak256:8bde4411…",
      "type": "endorsement",
      "statement": "meets.us.regulated.P1",
      "sig": "0xaaa…"
    }
  ],
  "metadata": {
    "domain": "reflexiveinsurance.com",
    "contact": "pgp:…",
    "jurisdictions": ["US-CA"]
  }
}
```

**Signing:** A TA **must** sign its TAO with `pubkey`. Peers verify signature before accepting advertisements or quotes referencing this TAI.

---

## A.5 Transaction Area Path (T‑Path)

An ordered list of TAIs attached to TGP advertisements/quotes to provide loop‑free path vector semantics.

```json
{
  "tgpPath": "tai:7abf92c6>tai:8bde4411>tai:2cf99133",
  "transactionAreas": [
    {"tai":"tai:7abf92c6…","areaName":"Reflexive-Insurance-CA","policyRoot":"0x9341…aa23"},
    {"tai":"tai:8bde4411…","areaName":"MaiaEdge-AI-US","policyRoot":"0x2291…ee12"},
    {"tai":"tai:2cf99133…","areaName":"Provider-EU","policyRoot":"0x77aa…19c2"}
  ]
}
```

**Loop prevention:** A TG **must** reject any route/quote whose `tgpPath` already contains its own TAI.

---

## A.6 Embedding in Quotes and x402 Context

**TGP Quote (excerpt):**
```json
{
  "tgpQuoteId": "tqp-7ff5b6b2",
  "asset": {"chain":"base-sepolia","erc20":"0x…USDC","decimals":6,"symbol":"USDC"},
  "price": {"amount":"10000","currency":"USDC","ttlSeconds":45},
  "transactionAreas": [ /* as in A.5 */ ],
  "tgpPath": "tai:7abf92c6>tai:8bde4411",
  "policyTags": ["us.regulated","kyc.P1"],
  "sig": "tai:7abf92c6 signer over quote hash"
}
```

**x402 header (single‑hop, exact+tgp1):**
```json
{
  "x402Version": 1,
  "scheme": "exact+tgp1",
  "network": "pulsechain",
  "payload": {
    "chainId": 369,
    "signature": "0x…",
    "authorization": {
      "from":"0x857b…b66","to":"0x2096…87C","value":"10000",
      "validAfter":"1740672089","validBefore":"1740672154",
      "nonce":"0xf374…3480-tqp-7ff5b6b2"
    },
    "tgpContext": {
      "tgpQuoteId": "tqp-7ff5b6b2",
      "tgpPath": "tai:7abf92c6>tai:8bde4411",
      "policyRoot": "0x9341…aa23"
    }
  }
}
```

---

## A.7 Attestations

Attestations are optional signed claims about a TA or a quote.

```json
{
  "attestationVersion": 1,
  "about": "tai:8bde4411…",
  "type": "endorsement | constraint | revocation",
  "statement": "meets.eu.regulated.P2",
  "evidence": "uri:ipfs://… or hash:0x…",
  "issuer": "tai:7abf92c6…",
  "sig": "0xdead…beef"
}
```

Gateways **may** weight routes/quotes using local policies over received attestations.

---

## A.8 Discovery

Implementations **may** support any mix of:
1. **Static peering** (out‑of‑band TAOs exchanged and pinned).  
2. **x402‑advertised** TAOs during session setup.  
3. **On‑chain registry** (optional) mapping TAIs → TAOs for transparency.  
4. **Gossip** among TGs (signed TAOs only).

Gateways **must** cache TAOs with signature and policyRoot for the duration of quote TTLs.

---

## A.9 Rotation, Revocation, and Policy Updates

- **Key rotation:** Publish a new TAO with `pubkey'`, include an attestation signed by old key linking old→new.  
- **Policy update:** New `policyRoot` ⇒ new TAI; quotes bearing old TAI expire per TTL.  
- **Revocation:** Issue a `revocation` attestation; peers **must** reject future quotes from that TAI after grace period.  
- **Clock discipline:** Use NTP/PTP and apply skew windows for TTL and validity checks.

---

## A.10 Security Considerations

- **Canonical serialization:** Use stable encodings to avoid TAI mismatches.  
- **Replay resistance:** Bind quotes to `tgpQuoteId`, `tgpPath`, and `policyRoot`; bind x402 nonce to `tgpQuoteId`.  
- **DoS:** Rate‑limit verification and cache validated TAOs/attestations.  
- **Jurisdictional tagging:** Prefer explicit `policyTags` and `jurisdictions`; avoid inference.  
- **Minimal disclosure:** Include only necessary policy hashes; avoid leaking full policy documents in‑band.

---

## A.11 Minimal Compliance Checklist (TG)

- [ ] Verify TAO signature and `policyRoot`.  
- [ ] Reject `tgpPath` containing self TAI (loop).  
- [ ] Cache TAO and attestations for TTL.  
- [ ] Bind quotes to `tgpQuoteId` + `tgpPath` + `policyRoot`.  
- [ ] Bind x402 nonce to `tgpQuoteId`.  
- [ ] Emit TDR rows including `tgpPath` and TAI of egress area.

---

## A.12 Example TDR Row (with TA context)

```
ts_start,ts_end,client_id,tgp_path,chain_id,token,amount,tx_hash,block,rs,tai_egress,quote_id,rc
2025-11-03T08:14:20Z,2025-11-03T08:14:33Z,c-9b12,
tai:7abf92c6>tai:8bde4411,369,USDC,10000,0xabc…def,12345678,0x2096…87C,tai:8bde4411,tqp-7ff5b6b2,OK
```

---

## A.13 IANA‑Style Considerations (None)

No central number registry is required for TAIs. Uniqueness is derived from cryptographic construction. Implementations may optionally use discovery registries for convenience, but correctness does not depend on them.
