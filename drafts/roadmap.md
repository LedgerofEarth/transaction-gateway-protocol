# TGP Roadmap

**Last Updated:** 2025-01

---

## Version 0.1 (Current - Draft)

**Status:** Public draft published  
**Focus:** Core protocol definition

### Deliverables
- ✅ Full TGP-00 specification
- ✅ Message schemas (QUERY, ADVERT, SELECT, LOCKED, PROOF, SETTLE, ERROR)
- ✅ State machine definition
- ✅ Attribute registry (base set)
- ✅ Example flows (three-domain scenario)
- ✅ GitHub repository with docs

### Open Work
- Reference implementation (see v0.2)
- x402 `htlc-path` header PR
- Testnet deployment

---

## Version 0.2 (Q2 2025)

**Focus:** Reference implementation & x402 integration

### Goals
1. **Reference Gateway Implementation**
   - Language: Rust (primary) + Go (alternative)
   - Features:
     - E-NAT wallet (HTLC management)
     - mTLS peering
     - Message signing/verification
     - TDR logging
     - Policy engine (rate limits, compliance checks)

2. **x402 Integration**
   - Submit `htlc-path` header PR to x402 spec
   - Implement TGP ↔ x402 bridge
   - TDR correlation with VGP state

3. **Testing Framework**
   - Unit tests for all message types
   - Integration tests (multi-hop scenarios)
   - Chaos testing (network failures, timeout attacks)

4. **Documentation**
   - Implementation guide
   - API reference
   - Deployment best practices

---

## Version 0.3 (Q3 2025)

**Focus:** Ecosystem expansion & advanced features

### Goals
1. **Multi-Currency Routing**
   - FX conversion at gateways
   - Cross-currency HTLC support (BTC → USD → EUR)
   - Real-time pricing feeds

2. **Privacy Enhancements**
   - Zero-knowledge proofs for compliance (zk-SNARKs)
   - Selective attribute disclosure (hide amount, reveal compliance status)
   - Encrypted path metadata

3. **Reputation System**
   - Gateway scoring based on:
     - Historical success rate
     - Settlement time accuracy
     - Dispute resolution
   - Decentralized reputation ledger (optional blockchain integration)

4. **Dynamic Repricing**
   - Real-time cost updates during `SERVING` state
   - Demand-based pricing (surge pricing for congested paths)
   - Client approval workflow for price changes

---

## Version 1.0 (Q4 2025)

**Focus:** Production readiness

### Goals
1. **Security Audit**
   - Third-party cryptographic review
   - Penetration testing
   - Formal verification of HTLC logic

2. **Compliance Framework**
   - Pre-built modules for KYC/AML/GDPR
   - Audit trail templates
   - Regulator engagement (feedback from financial authorities)

3. **Mainnet Launch**
   - Public production network
   - Onboarding documentation for gateway operators
   - Economic incentives for early adopters

4. **Ecosystem Tools**
   - Gateway monitoring dashboard
   - Path explorer (visualize route options)
   - Client SDK (JavaScript, Python, Rust)

---

## Version 2.0+ (2026 and Beyond)

**Speculative Features**

### Smart Contract Integration
- On-chain escrow for high-value transfers
- Programmable settlement conditions (e.g., delivery verification via oracle)

### Cross-Protocol Bridges
- Lightning Network interoperability
- Interledger Protocol (ILP) compatibility
- SWIFT/ISO 20022 messaging integration

### AI-Driven Routing
- Machine learning for optimal path selection
- Predictive failure detection
- Automated dispute resolution

### Federated Governance
- Community-driven attribute registry updates
- Decentralized protocol upgrades
- Multi-stakeholder standards body

---

## Community Contributions

We welcome proposals for:
- New message types or attributes
- Alternative implementations (language bindings)
- Use case demonstrations
- Security improvements

See [extension-proposal template](../.github/ISSUE_TEMPLATE/extension-proposal.md) to contribute.

---

## Release Criteria

Each version must meet:
- **Specification completeness:** All features documented
- **Reference implementation:** At least one working gateway
- **Test coverage:** >80% unit + integration tests
- **Security review:** Independent audit (v1.0+)
- **Community feedback:** Public review period (30+ days)

---

**Maintainer:** Ledger of Earth  
**Contact:** dbigge@ledgerofearth.org
