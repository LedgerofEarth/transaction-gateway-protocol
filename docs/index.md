# Value Gateway Protocol Documentation

Welcome to the **Value Gateway Protocol (VGP)** documentation.

## Quick Links

- 📘 **[Full Specification](/specs/VGP-00.md)** — Complete protocol definition
- 🧪 **[Three-Domain Example](/examples/three-domain-flow.md)** — Detailed walkthrough
- 📋 **[Attribute Registry](/drafts/VGP-attribute-registry.md)** — Extensible metadata fields
- 📄 **[One-Pager](/drafts/VGP-one-pager.md)** — Executive summary
- 🗺️ **[Roadmap](/drafts/roadmap.md)** — Future development plans

## What is VGP?

VGP is a **trust-boundary routing protocol** that enables atomic value transfers across administrative or economic domains using:

- **Path-vector routing** (like BGP, but for value)
- **HTLCs** (Hashed Time-Locked Contracts) for atomic settlement
- **Gateway policy enforcement** at trust boundaries
- **mTLS peering** with signed messages

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
- Service delivered via x402
- Proof submitted, HTLCs settle atomically

### Message Examples

All example messages are available in [`/examples/happy-path/`](/examples/happy-path/):
- [`query.json`](/examples/happy-path/query.json)
- [`advert.json`](/examples/happy-path/advert.json)
- [`select.json`](/examples/happy-path/select.json)
- [`proof.json`](/examples/happy-path/proof.json)
- [`settle.json`](/examples/happy-path/settle.json)

## JSON Schema

The complete message schema is defined in [`/schemas/vgp-messages.json`](/schemas/vgp-messages.json).

Use this for:
- Message validation
- Code generation
- Testing harnesses

## Contributing

We welcome contributions! To propose new features:

1. Read the [full specification](/specs/VGP-00.md)
2. Open an issue using the [extension proposal template](/.github/ISSUE_TEMPLATE/extension-proposal.md)
3. Discuss with the community
4. Submit a pull request

## Community

- **GitHub:** [ledgerofearth/vgp](https://github.com/ledgerofearth/vgp)
- **Email:** vgp@ledgerofearth.org
- **Organization:** [Ledger of Earth](https://ledgerofearth.org)

## License

Apache 2.0 — open for reference and contribution.

---

**VGP enables the Internet of Value — routing payments as flexibly as we route packets.**
