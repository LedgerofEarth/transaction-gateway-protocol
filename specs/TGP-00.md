# TGP-00: Transaction Gateway Protocol

## Abstract

The Transaction Gateway Protocol (**TGP-00**) defines a metadata signaling layer (**Layer 8**) that enables compliant, cross-boundary transaction routing in blockchain-based networks. It facilitates **trust-aware session coordination** between wallets, gateways, and AI agents operating across jurisdictions, identity systems, and regulatory zones.

TGP operates at Layer 8 — the economic layer — alongside the blockchain’s ledgers and distributed databases. It interacts directly with RPC endpoints or flattened ledger data to inform economic-layer routing and compliance decisions. It sits beneath identity (Layer 9) and policy (Layer 10) systems.

TGP supports both **direct settlement paths** (e.g. via x402) and **non-custodial swap settlement** through **CoreProver escrow contracts**. These escrow contracts facilitate safe exchange of value for value (e.g. tokens for tokens) or value for verifiable output (e.g. digital receipts, download links, or external delivery confirmation). Zero-knowledge proofs may be optionally required by TBC policy, but are **not inherently part of the escrow model**.

All accepted sessions result in emission of a **Transaction Detail Record (TDR)**, enabling traceable, auditable, and policy-compliant transaction flows without revealing sensitive user data. TGP is designed for compatibility with **AI-driven agents**, **cross-chain smart contracts**, and **federated compliance registries**, and serves as a foundational component of the emerging Layer 8–10 trust stack.


## Table of Contents

- Abstract
- 0. Introduction
  - 0.1 Where TGP Runs
  - 0.2 Relationship to x402
  - 0.3 Design Principles
- 1. Architecture
  - 1.1 Network Topology
  - 1.2 Gateway Functions
  - 1.3 Message Flow
  - 1.4 Settlement Topologies
- 2. Message Types
  - 2.1 QUERY … 2.7 ERROR
- 3. State Machine
- 4. Security Considerations
- 5. Attribute Registry
- 6. x402 Integration
- 7. Example Flows
- 8. Future Extensions
- 9. References
- 10. The 10-Layer Trust Stack (Informative)
- 11. TGP L8/L9/L10 Info Block (TIB)
- 12. Policy Expression Language (PEL-0.1)
- 13. State Summary Objects (SSO)
- 14. Receipts & TDR Triplet
- 15. Prover Abstraction & Settlement Middleware (Normative)
- Appendices
  - Appendix A: TAI – Transaction Area Identifier
  - Appendix B: CoreProver Reference
  - Appendix C: ZKB-01 – Zero Knowledge Buyer Proof
  - Appendix D: ZKS-01 – Zero Knowledge Seller Proof
  - Appendix E: ZKA – ZK Aggregator Registry
  - Appendix F: ZKB – Buyer ZK Reference Notes
  - Appendix G: ZKS – Seller ZK Reference Notes
  - Appendix H: Combined Buyer & Seller Reference
  - Appendix I: ZKR – ZK Receipts and Anchor Proofs
  - Appendix J: Terminology
  - Appendix K: Revision History
  - Appendix L: Deprecation Note


# TGP-00: Transaction Gateway Protocol

1.1 Network Topology

TGP is designed to operate across trust domains, enabling value-routing and policy negotiation between distinct agents, networks, and protocols. The topology includes both human participants and machine agents that mediate trust and compliance across domain boundaries.

TGP Topology Component Definitions
	•	Buyer
The economic initiator of a transaction. Typically originates a QUERY or ACCEPT message, provides payment, and expects delivery of a good, service, or receipt.

	•	Buyer Agent
	
An AI, browser extension, TBC instance, or delegated actor representing the buyer. It may handle escrow initiation, proof validation, or fulfillment verification.
	
	•	Seller
The economic recipient of value in exchange for delivering a product or fulfilling a service. Often responsible for confirming receipt or responding to policy-bound delivery.
	
	•	Seller Agent
An automated or delegated component that performs fulfillment validation, delivery tracking, or escrow interaction on behalf of the seller.
	
	•	Gateway
A TGP-aware process that resides at the trust boundary of a domain. It interprets TGP messages, enforces policy constraints, and facilitates routing and session handoff. In many deployments, it also acts as a facilitator or a TBC.
	
	•	Transaction Border Controller (TBC)
A hardened Gateway that adds rate-limiting, session logging, compliance enforcement, and protocol translation. It serves as the institutional or carrier-grade version of a Gateway.
	
	•	Facilitator
In x402-based flows, the facilitator acts as the payment intermediary. It may hold value temporarily or coordinate settlement between the buyer and seller without direct custody of goods. In TGP, the Gateway often serves this role.
	
	•	Prover (Escrow Middleware)
The TGP settlement controller. It verifies mutual acknowledgment of fulfillment before releasing escrowed funds or receipts. This component may operate as a smart contract with off-chain hooks, generating proof-of-receipt or compliance attestations. In ZK-enabled deployments, it may also validate zero-knowledge fulfillment proofs.
	
	•	Attribute Registry
A service or index that maps domain metadata (such as jurisdiction, compliance policies, or ledger characteristics) into policy tags or session constraints. Gateways use registries for trust evaluation and route decisions.
	
	•	x402 Service
A Layer 7 payment endpoint compatible with Coinbase’s x402 protocol. It receives TGP metadata, advertises price and terms, and interacts with the Gateway as part of session establishment. Optionally integrated directly into the Gateway.

### 1.4 Settlement Topologies

TGP supports multiple settlement architectures, each with distinct tradeoffs in terms of trust, fulfillment guarantees, and transaction finality.

#### A. x402 Direct Settlement (Gateway as Facilitator)

In this path, the TGP Gateway also functions as an x402 facilitator. The buyer sends a signed `X-PAYMENT` payload, and the gateway submits it to the chain on behalf of the seller.

            x402-Based Settlement Flow (Gateway as Facilitator)

    ┌────────────────────────────────────────────────────────┐
    │                    CONTROL PLANE                                                            │
    │                                                                                             │
    │   Buyer ─────→ Gateway (TGP + x402 Facilitator) ─────→ Seller                       │
    │        (sends X-TGP and signed X-PAYMENT headers)                                           │
    └────────────────────────────────────────────────────────┘
                         │                          ▲
                         ▼                          │
    ┌────────────────────────────────────────────────────────┐
    │                   SETTLEMENT PLANE                                                          │
    │                                                                                             │
    │   Buyer ─── signed tx ───→ Gateway ─── tx submit ───→ Blockchain                  │
    │                (payload)         (pays gas)         (sends to seller)                       │
    └────────────────────────────────────────────────────────┘


This model is suitable for low-friction or API-based payments where:
- The seller is trusted
- Delivery is automated
- Disputes are rare

**⚠️ Tradeoff:** If the seller disappears, delivers a broken link, or fails to fulfill, the buyer has no recourse. The funds are gone once the transaction is submitted.

---

#### B. CoreProver Escrow Settlement

In this model, the TGP Gateway coordinates with a CoreProver smart contract that escrows funds until:
- The seller acknowledges the session, and
- Optional zk-proof of delivery, receipt, or settlement is validated

```
          CoreProver Escrow-Based Settlement Flow

    ┌────────────────────────────────────────────┐
    │                CONTROL PLANE               │
    │                                            │
    │     Buyer ─────→ Gateway ─────→ Seller     │
    │        (TGP session, policy checks)        │
    └────────────────────────────────────────────┘
                     │              ▲
                     ▼              │
    ┌────────────────────────────────────────────┐
    │               SETTLEMENT PLANE             │
    │                                            │
    │     Buyer ─────→ CoreProver ←───── Seller   │
    │        (escrowed funds)     (ack/proof)     │
    └────────────────────────────────────────────┘
```

This model ensures non-custodial fairness and delivery-based value transfer. If the seller never confirms or proves delivery, funds can be refunded or re-routed.

Best suited for:
- Peer-to-peer commerce
- Digital delivery with receipts
- Non-reversible payment environments



## 2. Message Types

TGP defines the following message types for inter-gateway signaling:

- `QUERY`: Initiates a capability or path query
- `OFFER`: Suggests a viable route or settlement method
- `ACCEPT`: Confirms a proposed route or agreement
- `FINAL`: Signals readiness for finalization
- `RECEIPT`: Confirms successful delivery or transfer
- `REJECT`: Denies or aborts the proposed action
- `ERROR`: Notifies of protocol or transaction failure

These messages may be encapsulated in x402-compatible payloads or used independently across custom transport layers.

## 3. State Machine

Each TGP session progresses through well-defined states:

1. `Idle`
2. `QuerySent`
3. `OfferReceived`
4. `AcceptSent`
5. `Finalizing`
6. `Settled`
7. `Errored`

Gateways use timers and failure handling logic to resolve unresponsive or malformed messages, and may re-initiate under retry policy.

## 4. Security Considerations

TGP does not mandate encryption but recommends:

- Use of TLS or equivalent secure transport
- Signing of messages using domain keys
- Optional ZK proofs for policy compliance
- Logging of TDRs for auditability and compliance

Gateways must validate offers to ensure no settlement spoofing or value redirection occurs.

## 5. Attribute Registry

Gateways may maintain or consult an Attribute Registry for:

- Policy domains and compliance levels
- Regional legal flags or chain jurisdiction
- SLA commitments or availability guarantees
- x402 capability declarations (e.g. min/max price)

## 6. x402 Integration

TGP can operate as a control-plane overlay atop x402 sessions.

- x402 payment endpoints may embed TGP route attributes
- x402 Facilitators can implement gateway logic
- Dual-path offers (e.g. x402 and escrow) are supported

This allows for enhanced trust negotiation over existing payment paths.

## 7. Example Flows

### A. Simple Payment via x402
1. Buyer → QUERY → Gateway
2. Gateway → OFFER (x402)
3. Buyer → ACCEPT
4. x402 settles payment
5. Gateway → RECEIPT

### B. Escrow Settlement via CoreProver
1. Buyer → QUERY
2. Gateway → OFFER (escrow path)
3. Buyer → ACCEPT + deposit to escrow
4. Seller → ACK + fulfill item
5. CoreProver → RECEIPT to both

## 8. Future Extensions

TGP is designed to accommodate:

- Multi-hop settlement routing
- Pseudonymous agent negotiation
- Localized compliance overlays
- ZK audit trails and dispute resolution hooks

## 9. References

- [x402 Protocol](https://github.com/coinbase/x402)
- [TxIP-00 Spec](https://github.com/LedgerofEarth/txip)
- [CoreProver Contracts](https://github.com/LedgerofEarth/coreprove)
- [PEP-0.1 Policy Expression Language]

## 10. The 10-Layer Trust Stack (Informative)

```
Layer 10: Policy (Regulatory, Legal)
Layer 9 : Identity (Agent, Org, Wallet reputation)
Layer 8 : Economic (Ledger, On-chain state)
Layer 7 : Application (Service-specific logic)
Layer 6 : Presentation (Encoding, Formatting)
Layer 5 : Session (TGP/x402 negotiation state)
Layer 4 : Transport (QUIC, TCP, etc.)
Layer 3 : Network (IP addressing)
Layer 2 : Data Link (MAC, carrier media)
Layer 1 : Physical (Wires, Waves, Silicon)
```

## 11. TGP Info Block (TIB)

The TIB encodes L8–L10 context:

- `chain_id`, `ledger_state` (L8)
- `agent_id`, `domain_id`, `wallet_type` (L9)
- `policy_hash`, `compliance_tags` (L10)

## 12. Policy Expression Language (PEL-0.1)

A structured format to describe compliance:

```json
{
  "jurisdiction": "US",
  "requires": ["KYC", "OFAC"],
  "exemptions": ["NFT under $500"],
  "delivery_promise": "72h"
}
```

## 13. State Summary Objects (SSO)

SSOs summarize TGP state at each hop, enabling rehydration or auditing of partial sessions.

## 14. Receipts and TDR Triplet

Each transaction generates a verifiable triplet:

- `receipt_hash`
- `policy_proof`
- `final_delivery_ack`

This forms the audit and payment receipt system.

## 15. Prover Abstraction and Settlement Middleware

TGP supports middleware modules that:

- Invoke CoreProver escrow logic
- Validate ZK proofs
- Submit receipts to on-chain verifiers
- Interface with both x402 and custom smart contracts

---

## Appendices

### Appendix A: TAI – Transaction Area Identifier

`TGP-Appendix-A-TAI.md`  
Defines the schema for representing and matching Transaction Areas in gateway policy lookups.

### Appendix B: CoreProver Reference

`TGP-Appendix-CoreProver-Reference-E.md`  
Describes the CoreProver escrow settlement topology used as an alternative to x402.

### Appendix C: ZKB-01 – Zero Knowledge Buyer Proof

`ZKB-01-ZK-Buyer-Proof.md`  
Formal circuit for proving buyer control of a receipt address without revealing wallet.

### Appendix D: ZKS-01 – Zero Knowledge Seller Proof

`ZKS-01-ZK-Seller-Proof.md`  
Formal circuit for proving seller ownership of delivery address or escrow destination.

### Appendix E: ZKA – ZK Aggregator Registry

`TGP-Appendix-ZK-Aggregator-Reference-Appendix.md`  
Defines the structure for aggregators who register zk proof verifiers.

### Appendix F: ZKB – Buyer ZK Reference Notes

`TGP-Appendix-ZK-Buyer-Reference-Appendix-F.md`  
Practical reference materials and constraints used in ZKB-01 implementation.

### Appendix G: ZKS – Seller ZK Reference Notes

`TGP-Appendix-ZK-Seller-Reference-Appendix-G.md`  
Reference implementation and assumptions used in ZKS-01.

### Appendix H: Combined Buyer & Seller Reference

`TGP-Appendix-ZK-Buyer-and-Seller-Reference-Appendix.md`  
Joint appendix summarizing both ZKB and ZKS systems with schema links.

### Appendix I: ZKR – ZK Receipts and Anchor Proofs

`TGP-Appendix-ZK-Recipts-Reference-Appendix.md`  
Describes the receipt system, anchoring ZK proof of fulfillment or delivery.

### Appendix J: Terminology

Key terms used throughout the spec: TA, TZ, TDR, TIB, PEL, SSO, etc.

### Appendix K: Revision History

v0.1-draft — Fully aligned to canonical 10-layer trust stack and updated settlement architectures.

### Appendix L: Deprecation Note

Supersedes early drafts treating TGP as Layer 8.5 or solely dependent on x402 for finality.
