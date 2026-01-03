# Withdrawal Flow

Complete flow for TGP withdrawal execution.

---

## Overview

Withdrawals release escrowed funds from settlement contracts to sellers after conditions are met.

---

## States

```
SETTLED → TIMELOCK_ACTIVE → WITHDRAWABLE → WITHDRAWN
```

---

## Preconditions

Before withdrawal can execute:

1. ✅ Settlement exists and is SETTLED
2. ✅ Timelock period has elapsed
3. ✅ Not already withdrawn
4. ✅ Caller is the seller
5. ✅ No active disputes (if applicable)

---

## Withdrawal Steps

### 1. Seller Sends WITHDRAW Message

```javascript
{
  "type": "WITHDRAW",
  "tgp_version": "3.4",
  "id": "uuid",
  "nonce": 50,
  "timestamp": 1704070000000,
  "origin_address": "0xSeller...",
  "order_id": "ORD-123",
  "chain_id": 943,
  "signature": "0x..."
}
```

### 2. Gateway Validates

- Verify signature
- Check settlement exists
- Check timelock elapsed
- Check not already withdrawn
- Check caller is seller

### 3. Gateway Executes Withdrawal

```solidity
// On-chain execution
escrow.withdraw(orderId);
```

### 4. Contract Validates and Transfers

```solidity
function withdraw(bytes32 orderId) external {
  Settlement storage s = settlements[orderId];

  require(s.seller == msg.sender, "Not seller");
  require(!s.withdrawn, "Already withdrawn");
  require(block.timestamp >= s.settledAt + TIMELOCK, "Timelock active");

  s.withdrawn = true;

  (bool success, ) = s.seller.call{value: s.amount}("");
  require(success, "Transfer failed");

  emit Withdrawn(orderId, s.seller, s.amount, block.timestamp);
}
```

### 5. Gateway Returns ACK

```javascript
{
  "type": "ACK",
  "ref_id": "uuid",
  "status": "WITHDRAWN",
  "tx_hash": "0xabc...",
  "timestamp": 1704070001000
}
```

---

## Error Conditions

| Error | Condition | Retryable |
|-------|-----------|-----------|
| W200_NO_SUCH_ORDER | Unknown order_id | No |
| W201_NO_SETTLEMENT | Settlement not found | No |
| W202_NOT_SELLER | Caller not seller | No |
| W203_TIMELOCK_ACTIVE | Timelock not expired | Yes (wait) |
| W301_ALREADY_WITHDRAWN | Already withdrawn | No |
| W500_CONTRACT_REJECTED | On-chain revert | Maybe |

---

## Idempotency

Withdrawals MUST be idempotent:
- Same WITHDRAW message sent twice → second returns W301
- No double-withdrawal possible
- Safe to retry after network failures

---

## Security Properties

1. **No premature release** — Timelock enforced on-chain
2. **No double-withdrawal** — `withdrawn` flag prevents replay
3. **Deterministic** — Same inputs always produce same outputs
4. **Auditable** — All events emitted on-chain

---

## See Main README

For complete contract implementation, see [Escrow README](./README.md).

