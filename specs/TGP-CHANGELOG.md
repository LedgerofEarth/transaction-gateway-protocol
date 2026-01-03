# TGP Changelog

All notable changes to the Transaction Gateway Protocol specification will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.4.0] - 2025-01-02

### Added

#### Preview Layer (Major Feature)
- **Cryptographically committed transaction previews** with hash-based binding
- **Preview hash** field in ACK and SETTLE messages (REQUIRED in SETTLE)
- **Gas mode determination** (RELAY vs WALLET) with graceful fallback
- **Settlement contract binding** in preview to prevent contract substitution
- **Execution deadline** enforcement to prevent stale preview usage
- **Single-use preview consumption** to prevent replay attacks
- **Preview nonce** for unique preview identification

#### New Message Fields
- `preview_hash` in SETTLE (REQUIRED)
- `preview_hash` in ACK (advisory)
- `gas_mode` in ACK (advisory, not canonical)
- `settlement_contract` in ACK (advisory)
- `force_wallet` in QUERY (optional hint)
- `settlement_contract` in QUERY (optional hint)

#### New Error Codes
- `V400_PREVIEW_GENERATION_FAILED` — Preview generation failure
- `V401_PREVIEW_NOT_FOUND` — Unknown order_id in preview lookup
- `V402_PREVIEW_HASH_MISMATCH` — Provided hash doesn't match stored preview
- `V403_PREVIEW_EXPIRED` — Preview past execution deadline
- `V404_PREVIEW_ALREADY_CONSUMED` — Preview already used for settlement
- `V405_INVALID_SETTLEMENT_CONTRACT` — Contract verification failed
- `V406_PREVIEW_EXECUTION_IN_PROGRESS` — Concurrent settlement attempt

#### Documentation
- Complete Preview Layer specification (Part 2, Section 1)
- Migration guide (v3.3 → v3.4)
- Implementation checklists for clients and gateways
- Canonical hash examples including preview_hash
- Security analysis for Preview Layer

### Changed

#### Protocol Improvements
- Enhanced error semantics with retry guidance
- Improved UX hints with gas mode signaling
- Better separation of canonical vs advisory data
- Clearer distinction between base protocol and extensions

#### Message Flow
- SETTLE now REQUIRES preview_hash (breaking change from v3.3)
- ACK now includes preview commitment
- QUERY triggers preview generation

#### Security
- Preview replay protection via single-use consumption
- Preview expiration enforcement
- Settlement contract binding prevents substitution attacks
- Gas price manipulation prevented via canonical hash

### Deprecated
- TxIP-00 transport protocol (merged into TGP-00 v3.4)
- Legacy SETTLE without preview_hash (v3.3 compatibility mode temporary)

### Migration Notes

**For Gateway Implementations:**
1. Implement preview generation for all QUERY messages
2. Store previews with consumption tracking
3. Verify preview_hash in SETTLE messages
4. Enforce execution_deadline_ms
5. Mark previews consumed after settlement
6. Support dual v3.3/v3.4 mode during transition

**For Wallet Implementations:**
1. Store preview_hash from ACK responses
2. Include preview_hash in SETTLE messages
3. Update signature logic to include preview_hash
4. Display preview details to users before signing
5. Handle preview expiration errors
6. Persist preview state across sessions

**Backward Compatibility:**
- v3.3 messages supported during transition period
- Gateways SHOULD auto-generate previews for v3.3 QUERY
- After transition, v3.3 SETTLE (without preview_hash) will be rejected

---

## [3.3.0] - 2024-12-01

### Added
- Enhanced replay protection with UUID deduplication
- WITHDRAW message for escrow release
- Agent coordination messages (INTENT, AGENT_STATUS)
- Formal authentication matrix
- Extended diagnostic messages

### Changed
- Improved signature verification process
- Enhanced nonce validation rules
- Refined timestamp window checks

### Fixed
- Ambiguous error code semantics
- Inconsistent canonicalization examples

---

## [3.2.0] - 2024-10-15

### Added
- WebSocket transport layer specification
- Canonical hashing and signature verification
- PING/PONG health checks
- VALIDATE pre-signature checking
- Complete error code catalog

### Changed
- Consolidated message envelope structure
- Unified nonce and timestamp rules

---

## [3.1.0] - 2024-08-20

### Added
- Initial economic message specifications (QUERY, ACK, SETTLE)
- Basic commitment state machine
- Settlement executor interface

---

## [3.0.0] - 2024-06-10

### Added
- Initial public specification release
- Core protocol principles
- Message categories (Economic, Transport, Agent)
- Trust model and security guarantees

---

## Extension Changelog

### [3.4-ZK] - 2025-01-02

**Status:** Stable Extension

#### Added
- Zero-knowledge proof support via optional fields
- `zk_proof` field in SETTLE (Groth16 proof structure)
- `buyer_commitment` field in SETTLE (Poseidon hash)
- On-chain verification semantics
- ZK-specific error codes (Z601-Z603)
- Complete ZK extension specification

#### Features
- Privacy-preserving buyer commitment
- Cryptographic proof of intent
- No revelation of wallet addresses or amounts
- Optional per-transaction activation
- Backward compatible with base protocol

---

## Upcoming Changes

### Planned for v3.5
- Enhanced agent coordination
- Performance optimization hints
- Additional settlement types

### Under Discussion
- Multi-signature settlement extension
- Cross-chain atomic swap extension
- Recurring payment extension
- Gasless execution extension

---

## Version History Summary

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 3.4.0 | 2025-01-02 | Minor | Preview Layer, enhanced security |
| 3.3.0 | 2024-12-01 | Minor | WITHDRAW, agent messages |
| 3.2.0 | 2024-10-15 | Minor | WebSocket, canonicalization |
| 3.1.0 | 2024-08-20 | Minor | Economic messages |
| 3.0.0 | 2024-06-10 | Major | Initial release |

---

## Extension Version History

| Extension | Version | Date | Description |
|-----------|---------|------|-------------|
| ZK | 3.4-ZK | 2025-01-02 | Zero-knowledge proofs (optional) |

---

## Deprecation Timeline

| Feature | Deprecated | Removal | Replacement |
|---------|-----------|---------|-------------|
| TxIP-00 | v3.4.0 (2025-01-02) | v4.0.0 (TBD) | Merged into TGP-00 v3.4 |
| v3.3 SETTLE | v3.4.0 (2025-01-02) | v3.5.0 (TBD) | SETTLE with preview_hash |

---

## How to Read This Changelog

### Change Types
- **Added** — New features or capabilities
- **Changed** — Changes to existing functionality
- **Deprecated** — Features marked for future removal
- **Removed** — Features removed in this version
- **Fixed** — Bug fixes or clarifications
- **Security** — Security improvements or fixes

### Version Numbers
```
MAJOR.MINOR.PATCH

MAJOR — Breaking changes
MINOR — New features (backward compatible)
PATCH — Bug fixes (backward compatible)
```

### Extension Versions
```
TGP-00-v<BASE>-<EXTENSION>

Example: TGP-00-v3.4-ZK
```

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to propose changes that will appear in this changelog.

---

**License:** Apache 2.0  
**Maintained by:** TGP Community

