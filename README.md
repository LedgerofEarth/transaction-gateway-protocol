🌐 Transaction Gateway Protocol (TGP)

Status: Draft Specification – v3.2
Maintainer: Ledger of Earth
License: Open Specification (code components: commercial license)

⸻

🚀 Overview

The Transaction Gateway Protocol (TGP) is an open, deterministic, chain-agnostic signaling protocol that enables untrusted parties to coordinate safe blockchain transactions through a policy-aware payment gateway such as the Transaction Border Controller (TBC).

TGP creates a Layer-8 economic control plane for secure “transaction NAT,” escrow flows, and multi-hop policy validation without ever touching user keys or modifying wallet behavior.

TGP standardizes how:
	•	a Client expresses transaction intent (QUERY)
	•	a Gateway verifies the request using layered verification (L1–L6)
	•	the Gateway returns executable authorization (ACK allow)
	•	settlement events are conveyed back to the Client (SETTLE)

Wallets remain blind signers.
Gateways remain non-custodial verifiers.
Smart contracts enforce final settlement.

⸻

🧩 Why TGP Exists

Modern blockchain apps and AI agents cannot safely:
	•	negotiate multi-step payments
	•	enforce escrow conditions
	•	protect wallet privacy
	•	perform merchant authenticity checks
	•	route transactions across compliance or jurisdictional boundaries
	•	prevent calldata manipulation or address substitution
	•	coordinate settlement across chains or policies

TGP solves this by defining a standardized, deterministic message framework that sits above wallets and below applications.

It provides:
	•	Deterministic transaction construction
	•	Verifiable policy evaluation
	•	Multi-step escrow sequencing
	•	Gateway-mediated settlement
	•	Wallet-agnostic operation
	•	Zero custody / zero key exposure

And it does so without requiring new blockchain primitives.

⸻

🔐 Trust-Minimized Design

TGP is explicitly:

Non-custodial

The Gateway cannot seize or move funds.

Trust-minimized

Gateways evaluate intent but cannot create, modify, or force spending beyond the user-approved Economic Envelope.

Deterministic

Every compliant Gateway produces identical responses for identical inputs.

Isolated

Dealers, merchants, agents, and wallets never need to trust each other directly.

Aligned with Satoshi’s model of safe two-party exchange

“It’s cryptographically possible to make a risk-free trade…
The second signer can’t release one without releasing the other.”
— Satoshi Nakamoto, Dec 10, 2010

TGP generalizes this principle to multi-verb settlement flows.

⸻

🏗 The TGP Message Model

TGP defines four top-level protocol messages:

Message	Purpose
QUERY	Client → Gateway expressing intent
ACK	Gateway → Client authorization (offer/allow/deny/revise)
ERROR	Gateway → Client failure at any verification layer
SETTLE	Gateway → Client final on-chain settlement notification

ACK.status = "offer" provides a preview.
ACK.status = "allow" contains the executable Economic Envelope.

The Gateway must not maintain session state; all context is carried within each QUERY.

⸻

🏛 Governance & Verification Layers

Every QUERY is evaluated through six verification layers:
	1.	L1 — Registry & Merchant Validation
	2.	L2 — Cryptographic Validation
	3.	L3 — Contract Bytecode & RPC Integrity
	4.	L4 — ZK Attestation (optional)
	5.	L5 — Policy Evaluation
	6.	L6 — Escrow / WITHDRAW Eligibility

Any failure → deterministic ERROR.

⸻

🔀 Relationship to x402

TGP is not a modification of wallets.
TGP is not a replacement for x402.

Instead, TGP sits adjacent to x402 as the economic signaling layer.

x402 provides:
	•	agent-to-app negotiation
	•	metadata transport

TGP provides:
	•	trust boundaries
	•	authorization
	•	deterministic transaction envelopes
	•	settlement signaling

A merchant or agent may trigger TGP via:
	•	HTTP 402 Payment Required (canonical)
	•	x402.payment_required event
	•	QR-derived payment profile
	•	direct client-initiated “Direct Pay” mode

⸻

📁 Repository Structure

/specs
    TGP-00.md          # Core protocol
    TGP-CP-00.md       # Client runtime profile
    TGP-EXT-00.md      # Browser extension runtime
    TBC-00.md          # Gateway architecture
    CoreProve-00.md    # On-chain settlement model

/examples
    message_flows/     # QUERY → ACK → SETTLE examples

/schemas
    tgp/               # JSON schemas for QUERY/ACK/SETTLE
    routing/           # Transaction area + path metadata

/docs
    design/            # Architectural notes
    integration/       # Wallet + extension integration docs


⸻

💻 Quick Start

git clone https://github.com/LedgerOfEarth/transaction-gateway-protocol.git
cd transaction-gateway-protocol
open specs/TGP-00.md

TGP-00 v3.2 is the current authoritative specification.

⸻

🧠 Intended For
	•	Wallet developers
	•	Payment processors
	•	AI agent platforms
	•	Telecom operators & ISPs
	•	RPC and infrastructure providers
	•	Smart contract developers
	•	Financial institutions requiring deterministic, policy-gated blockchain payments

⸻

🚫 Disclaimer

This repository is part of the Ledger of Earth research initiative.
The specifications are open and intended for interoperability and peer review.

Code components are not audited and are not meant for production use.
