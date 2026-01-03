Appendix I – ZKA-01: Zero-Knowledge Aggregator Registry & Signature Standard

(Normative / Informative Hybrid)

I.1 Purpose

ZKA-01 defines how aggregators advertise, federate, and cryptographically attest the ZK proving systems they operate.
It creates the trust and discovery fabric that lets any TGP gateway or CoreProver:
	•	Discover available ZK verifiers by capability and jurisdiction.
	•	Verify that a proof’s verifying key or circuit hash is authentic.
	•	Select an aggregator based on policy, cost, or latency.
	•	Audit proofs across domains without exposing private data.

This appendix standardizes the Aggregator Manifest, Registry Advertisement, and ZK-Signature Envelope used in all TGP messages that reference proofs.

⸻

I.2 Scope

Applies to:
	•	ZKB-01, ZKS-01, ZKX-01 circuits and any successors.
	•	Gateways, CoreProvers, and external verifiers operating in TGP networks.
	•	Federated registries maintaining signed aggregator manifests.

⸻

I.3 Architecture Overview

+----------------------------+
|  TGP Gateway / CoreProver  |
+-------------+--------------+
              |
        (query registry)
              v
+-------------+--------------+
|  ZK Aggregator Registry    |
|  - Manifest DB             |
|  - Audit / Signatures      |
+-------------+--------------+
              |
       (select aggregator)
              v
+-------------+--------------+
|  Aggregator Node           |
|  - Proof Batching          |
|  - Recursive Aggregation   |
|  - Fee / Latency Metrics   |
+----------------------------+

Multiple registries MAY exist and cross-sign manifests (federated model).

⸻

I.4 Aggregator Manifest Schema

Each aggregator publishes a signed JSON (or CBOR) manifest describing its verifiers and policies.

{
  "aggregator_id": "agg.us.zk",
  "version": 1,
  "jurisdiction": "US",
  "organization": "Ledger of Earth Verification Services",
  "supported_systems": ["halo2", "plonk"],
  "supported_profiles": ["ZKB-01", "ZKS-01", "ZKX-01"],
  "verifier_contracts": [
    {
      "profile": "ZKX-01",
      "system": "halo2",
      "curve": "bn254",
      "contract": "0xVerifier123",
      "code_hash": "0xabc...789"
    }
  ],
  "fee_model": {"unit": "USDC", "per_proof": 0.002, "batch_discount": 0.1},
  "avg_latency_ms": 120,
  "sla": {"uptime_pct": 99.9, "jurisdiction": "US"},
  "auditor_did": "did:loe:audit-lab",
  "manifest_hash": "sha256(manifest)",
  "signature": "ed25519(sig over manifest_hash)"
}


⸻

I.5 Registry Advertisement Message (ADVERT.ZKAGG)

Gateways learn about aggregators via registry broadcasts or peer queries.

{
  "tgp_version": "0.1",
  "message_type": "ADVERT.ZKAGG",
  "sender": "registry.tgp.net",
  "aggregators": [
    {
      "aggregator_id": "agg.us.zk",
      "manifest_hash": "0xabc...",
      "jurisdiction": "US",
      "systems": ["halo2","plonk"],
      "latency_ms": 120,
      "fee_usd": 0.002
    }
  ],
  "ttl": 3600
}

Peers cache adverts until TTL expiry or manifest rotation.

⸻

I.6 ZK-Signature Envelope (ZKSE)

A uniform signature container for any proof verified under TGP.

{
  "zk_signature_envelope": {
    "aggregator_id": "agg.us.zk",
    "manifest_hash": "0xabc...",
    "proof_root": "0x9f3b...",
    "policy_hash": "0xd15c...",
    "trace_id": "uuid-v4",
    "timestamp": "ISO-8601",
    "sig_algo": "ed25519",
    "signature": "base64(ed25519(sig over canonical envelope))"
  }
}

Gateways log the envelope hash in TDRs to provide cross-registry auditability.

⸻

I.7 Verifier Selection Policy

TGP nodes MAY include a zk_aggregator_policy block in their L10 policy:

{
  "zk_aggregator_policy": {
    "allow_regions": ["US","EU"],
    "deny_ids": ["agg.shadow.zk"],
    "preferred_systems": ["halo2"],
    "max_fee_usd": 0.005,
    "min_uptime_pct": 99.0
  }
}

During routing, gateways choose the aggregator whose manifest satisfies this policy.

⸻

I.8 Signature Chain Validation

Validation sequence:
	1.	Verify manifest signature → trusted registry public key.
	2.	Verify manifest_hash = hash(manifest).
	3.	Verify proof verifier_contract and code_hash against manifest.
	4.	Verify zk_signature_envelope.sig using aggregator’s key.
	5.	Verify envelope fields match policy_hash / trace_id.

Only if all pass MAY the proof be accepted as valid for SETTLE.

⸻

I.9 Registry Synchronization and Transparency

Registries SHOULD:
	•	Publish Merkle roots of all active manifests.
	•	Append manifest rotations to an immutable audit log (blockchain, IPFS, or append-only log).
	•	Support QUERY.ZKAGG for direct fetches:

{
  "message_type": "QUERY.ZKAGG",
  "aggregator_id": "agg.us.zk"
}


⸻

I.10 Economic and Routing Metadata

Aggregators MAY advertise:
	•	fee_model (fixed / variable / per kB).
	•	batch_capacity and expected_finality_ms.
	•	jurisdiction and compliance_tags (GDPR, OFAC, etc.).
Gateways MAY include these in route-cost calculations to perform proof path optimization (choose cheapest compliant verifier).

⸻

I.11 Security & Compliance

Property	Requirement
Manifest Authenticity	Must be signed by aggregator private key registered with registry.
Key Rotation	Aggregators MAY rotate signing keys; registries MUST timestamp rotations.
Denial Resistance	Gateways cache last-known good manifests for grace_ms period.
Privacy	Aggregators log only proof metadata, never private inputs.
Compliance	Jurisdictions MAY require aggregators to embed selective-disclosure VCs proving licensure.


⸻

I.12 Extensibility

Future ZKA revisions may add:
	•	Post-quantum signature suites (Dilithium, Falcon).
	•	Multi-signature aggregator federations.
	•	ZK proof-of-stake attestations for registry trust.
	•	Decentralized discovery using DHTs or ENS-style identifiers.

All new fields MUST use explicit JSON keys and be ignored by older implementations.

⸻

I.13 Audit Example

TDR Log Fields:

ts, trace_id, policy_hash, zk_aggregator_id,
manifest_hash, proof_root, verifier_contract, fee_paid, latency_ms

These records allow later audit reconstruction of:
	•	which proof system validated a transaction,
	•	under which manifest and jurisdiction,
	•	at what time and cost.

⸻

I.14 Relationship to Other Appendices

Appendix	Relationship
E (CoreProver)	Defines escrow & fulfillment primitives that emit proofs.
F (G)	Define ZK circuits (buyer/seller).
H (ZKX)	Defines combined settlement proof verified via aggregator.
I (ZKA)	Defines how those proofs are registered, discovered, and signed.


⸻

I.15 Summary

ZKA-01 transforms the isolated ZK verifiers of TGP into a federated, routable proof layer.
It ensures every proof is:
	•	discoverable through registry adverts,
	•	verifiable via standardized signatures, and
	•	economically comparable across jurisdictions.

