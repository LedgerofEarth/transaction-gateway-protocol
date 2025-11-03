# Transaction Gateway Protocol (TGP-00)

**Status:** Draft v0.1 — Published by Ledger of Earth  
**Spec URL:** [/specs/VGP-00.md](./specs/TGP-00.md)  
**Documentation Site:** https://ledgerofearth.github.io/tgp/

TGP defines a **trust-boundary protocol** for transaction quoting, selecting, locking, and settling *value paths* across administrative or agentic domains.

It operates **above x402**, using extensible settlement mechanisms to ensure atomic value transfer while isolating financial logic from router control planes.

## Core Principles

- **Path-vector negotiation** (like BGP, but for value)
- **Per-request lifecycle:** `DISCOVER → QUOTED → SELECTED → LOCKED → SERVING → PROVED → SETTLED → CLOSED`
- **Secure mTLS peering** with signed adverts and encrypted TDR logs
- **Policy enforcement** at gateway boundaries for compliance and risk management
- **Extensible attribute registry** for QoS, risk, compliance, and escrow types

## Implementation Notes

TGP itself is agnostic to wallet mapping or escrow design.  
Implementations **MAY**:
- Use E-NAT-style border wallets for policy isolation
- Use HTLC or other escrow mechanisms for settlement (state channels, ZK-attested transfers, trusted custodial escrow)
- Choose any combination that satisfies atomic settlement and refund safety requirements

Both settlement mechanisms and enforcement architecture are deploy-time choices, not part of the VGP specification.

## Documentation

This repository contains both the **protocol specification** and an **interactive documentation website**.

### View Documentation
- **Web Interface:** Visit the [documentation site](https://ledgerofearth.github.io/vgp/) for an interactive experience
- **Read Locally:** All markdown files are browsable in this repository

### Core Files
- **[/specs/TGP-00.md](./specs/TGP-00.md)** — Complete protocol specification
- **[/examples/three-domain-flow.md](./examples/three-domain-flow.md)** — Detailed example with JSON messages
- **[/schemas/tgp-messages.json](./schemas/tgp-messages.json)** — JSON Schema for message validation
- **[/drafts/TGP-attribute-registry.md](./drafts/TGP-attribute-registry.md)** — Extensible attribute definitions
- **[/drafts/TGP-one-pager.md](./drafts/TGP-one-pager.md)** — Executive summary
- **[/drafts/roadmap.md](./drafts/roadmap.md)** — Development roadmap

## Contributing

We welcome contributions! Please see our [extension proposal template](.github/ISSUE_TEMPLATE/extension-proposal.md) for suggesting new attributes, message types, or schema extensions.

## Development

### Running Locally

To run the documentation site locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The site will be available at `http://localhost:8080`.

### Building for Production

```bash
npm run build
```

## License

Apache 2.0 — open for reference and contribution.

## About Ledger of Earth

This protocol is published by [Ledger of Earth](https://ledgerofearth.org), advancing trust-boundary value routing for the x402 ecosystem.
