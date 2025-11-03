# Transaction Gateway Protocol (TGP)

**Status:** Draft Specification – v0.1  
**Maintainer:** [Ledger of Earth](https://github.com/LedgerOfEarth)  
**Linked PR:** [coinbase/x402 – TGP-00 Draft Spec](https://github.com/coinbase/x402/pulls)  
**License:** MIT  

---

## Overview

The **Transaction Gateway Protocol (TGP)** is a proposed extension to [x402](https://github.com/coinbase/x402) that defines a control plane for routing and settling value across independent **Transaction Areas (TAs)**.

TGP enables:
- **Policy negotiation** between transaction domains  
- **Multi-hop route discovery** for value transfers  
- **Atomic settlement** coordination using HTLC-like primitives  
- **Metadata exchange** describing cost, risk, and compliance

TGP operates above x402 as a peer-to-peer signaling protocol—analogous to how **BGP** routes packets between autonomous systems, but applied to **value and trust boundaries**.

---

## Purpose

This repository provides the **reference materials and PoC implementation** for TGP.  
It serves as the companion to the [TGP-00 specification draft](./specs/TGP-00.md) submitted to the x402 project.

It is intended for **discussion and interoperability testing**, not for production deployment.

---

## Repository Structure

| Path | Description |
|------|--------------|
| `specs/TGP-00.md` | Formal draft specification |
| `examples/` | Example message flows and negotiation demos |
| `schemas/` | JSON / TypeScript schema definitions for protocol metadata |
| `docs/` | Supporting documentation and design notes |

---

## Quick Start

Clone and explore locally:

```bash
git clone https://github.com/LedgerOfEarth/transaction-gateway-protocol.git
cd transaction-gateway-protocol
open specs/TGP-00.md
```

You can also view the active draft online via the [TGP-00 PR at Coinbase/x402](https://github.com/coinbase/x402/pulls).

---

## Context

TGP aims to provide a foundation for:
- **AI agentic payments** across compute and data domains  
- **Telecom-grade transaction gateways** for blockchain networks  
- **Cross-chain coordination** where economic or regulatory boundaries exist  

It is the first step toward a **Transaction Border Controller (TBC)** framework—establishing verifiable trust, cost, and policy layers above transport.

---

## Disclaimer

This repository is part of the **Ledger of Earth** research initiative exploring blockchain-based transaction control planes for autonomous systems and carrier-grade environments.

> **Important:**  
> This is a **conceptual prototype** for peer review.  
> It is *not audited, production-ready, or intended for commercial use.*
