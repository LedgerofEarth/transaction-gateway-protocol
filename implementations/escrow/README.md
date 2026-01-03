# TGP Escrow Contract Reference

Reference smart contract implementations for TGP-compliant settlement.

---

## Overview

TGP escrow contracts:
- Hold funds during settlement
- Validate settlement conditions
- Enforce preview commitments (optional but recommended)
- Execute withdrawals deterministically
- Emit settlement events

---

## Contracts

### 1. MinimalEscrow.sol
Basic escrow without preview binding. Demonstrates core settlement flow.

### 2. PreviewBoundEscrow.sol
Enhanced escrow with preview hash validation. Recommended for production.

### 3. Withdrawal Flow
See [`withdrawal-flow.md`](./withdrawal-flow.md) for complete withdrawal semantics.

---

## Contract Responsibilities

### Must Implement
✅ Accept settlements from buyers
✅ Validate settlement parameters
✅ Hold funds securely until conditions met
✅ Execute withdrawals to sellers
✅ Emit events for all state changes

### Must NOT Do
❌ Allow premature withdrawal
❌ Allow double-withdrawal
❌ Bypass validation steps
❌ Accept invalid previews (if preview-bound)

---

## Security Considerations

### 1. Preview Binding

Preview-bound contracts MUST:
- Store preview_hash with settlement
- Validate preview_hash on deposit
- Prevent replay of same preview_hash

### 2. Withdrawal Protection

Contracts MUST:
- Enforce timelocks/conditions
- Prevent double-withdrawal
- Validate seller identity
- Check settlement state

### 3. Reentrancy Protection

Use OpenZeppelin's `ReentrancyGuard` or equivalent:

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard {
  function withdraw() external nonReentrant {
    // withdrawal logic
  }
}
```

---

## Testing

Before deployment:
1. ✅ Test settlement with valid preview
2. ✅ Test settlement with invalid preview (should revert)
3. ✅ Test premature withdrawal (should revert)
4. ✅ Test double-withdrawal (should revert)
5. ✅ Test withdrawal after conditions met (should succeed)
6. ✅ Test reentrancy attacks
7. ✅ Audit with professional security firm

---

## Deployment Checklist

- [ ] Compile with Solidity 0.8.0+
- [ ] Enable optimizer (200 runs minimum)
- [ ] Test on testnet extensively
- [ ] Audit smart contracts
- [ ] Verify source code on block explorer
- [ ] Document deployment addresses
- [ ] Test with actual gateway integration

---

## Further Reading

- **[TGP-00 v3.4 Part 2](../../specs/TGP-00-v3.4-Part2.md)** — Settlement message specifications
- **[OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)** — Secure contract patterns
- **[Solidity Documentation](https://docs.soliditylang.org/)** — Language reference

---

**⚠️ Warning:** These are reference implementations for educational purposes. Production contracts require professional security audits.

