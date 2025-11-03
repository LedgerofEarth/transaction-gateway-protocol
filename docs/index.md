# Transaction Gateway Protocol Documentation

Welcome to the **Transaction Gateway Protocol (TGP)** documentation.

## Quick Links

- 📘 **[Full Specification](/specs/TGP-00.md)** — Complete protocol definition
- 🧪 **[Three-Domain Example](/examples/three-domain-flow.md)** — Detailed walkthrough
- 📋 **[Attribute Registry](/drafts/TGP-attribute-registry.md)** — Extensible metadata fields
- 📄 **[One-Pager](/drafts/TGP-one-pager.md)** — Executive summary
- 🗺️ **[Roadmap](/drafts/roadmap.md)** — Future development plans

## What is TGP?

TGP is a **path-vector transaction-routing protocol** that operates at trust boundaries, enabling atomic value transfers across administrative or economic domains.

TGP defines the **control and policy layer** for value routing. Settlement mechanics (HTLC, state channels, etc.) and local enforcement architectures (E-NAT, border wallets) are implementation choices and not part of this specification.

**Core Features:**
- **Path-vector routing** (similar to BGP, but for transactions)
- **Extensible settlement mechanisms** (HTLCs, state channels, ZK-attested transfers, custodial escrow)
- **Gateway policy enforcement** at trust boundaries
- **mTLS peering** with signed messages
- **Atomic settlement** guarantees with safe refund semantics

## Core Message Types

| Message | Purpose |
|---------|---------|
| `QUERY` | Request paths from client |
| `ADVERT` | Advertise available routes |
| `SELECT` | Choose path and lock HTLCs |
| `LOCKED` | Confirm HTLC creation |
| `PROOF` | Submit service delivery proof |
| `SETTLE` | Finalize payment |
| `ERROR` | Report failures |

## State Machine

```
DISCOVER → QUOTED → SELECTED → LOCKED → SERVING → PROVED → SETTLED → CLOSED
                                   ↓
                             (timeout) → REFUNDED → CLOSED
```

## Example Scenarios

### Happy Path (Three Domains)

See [three-domain-flow.md](/examples/three-domain-flow.md) for complete JSON examples of:
- Client A queries Gateway B
- Gateway B advertises path via Provider C
- Client selects path, HTLCs lock
- Signaling between SBCs via x402
- Proof submitted, HTLCs settle atomically

### Message Examples

All example messages are available in [`/examples/happy-path/`](/examples/happy-path/):
- [`query.json`](/examples/happy-path/query.json)
- [`advert.json`](/examples/happy-path/advert.json)
- [`select.json`](/examples/happy-path/select.json)
- [`proof.json`](/examples/happy-path/proof.json)
- [`settle.json`](/examples/happy-path/settle.json)

## JSON Schema

The complete message schema is defined in [`/schemas/tgp-messages.json`](/schemas/tgp-messages.json).

Use this for:
- Message validation
- Code generation
- Testing harnesses

## Contributing

We welcome contributions! To propose new features:

1. Read the [full specification](/specs/TGP-00.md)
2. Open an issue using the [extension proposal template](/.github/ISSUE_TEMPLATE/extension-proposal.md)
3. Discuss with the community
4. Submit a pull request

## Community

- **GitHub:** [ledgerofearth/vgp](https://github.com/ledgerofearth/tgp)
- **Email:** dbigge@ledgerofearth.org
- **Organization:** [Ledger of Earth](https://ledgerofearth.org)

## License

Apache 2.0 — open for reference and contribution.

---

**TGP enables the Internet of Value — routing payments as flexibly as we route packets.**
