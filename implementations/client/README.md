# TGP Client Reference Implementation

A TGP client is any software that signs and sends economic messages to gateways. This includes wallets, browser extensions, command-line tools, and autonomous agents.

---

## Overview

### Client Responsibilities

1. **Message Signing** — Sign all economic messages with EIP-712
2. **Preview Management** — Store and include preview hashes
3. **Replay Protection** — Manage nonces, timestamps, and UUIDs
4. **User Interaction** — Display transaction details before signing
5. **Error Handling** — Handle gateway responses gracefully

### Client Does NOT

- ❌ Hold funds for others (non-custodial)
- ❌ Validate other parties' signatures
- ❌ Generate previews (gateway responsibility)
- ❌ Execute settlements (escrow responsibility)

---

## Message Flow

### 1. Connect to Gateway

```javascript
const ws = new WebSocket('wss://gateway.example.com/tgp');

ws.onopen = () => {
  // Send PING to synchronize clock
  ws.send(JSON.stringify({
    type: 'PING',
    timestamp: Date.now()
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  handleMessage(msg);
};
```

### 2. Send QUERY (Buyer Commits)

```javascript
async function sendQuery(order) {
  const message = {
    type: 'QUERY',
    tgp_version: '3.4',
    id: uuidv4(),
    nonce: await getNonce(buyerAddress),
    timestamp: Date.now(),
    origin_address: buyerAddress,
    intent: {
      verb: 'COMMIT',
      party: 'BUYER',
      mode: 'DIRECT',
      payload: {
        order_id: order.id,
        amount_wei: order.amount,
        asset: 'NATIVE',
        merchant_id: order.merchantId
      }
    },
    chain_id: 943,
    force_wallet: false  // Optional hint
  };

  // Canonical signing (see signing-flow.md)
  const signature = await signMessage(message);
  message.signature = signature;

  ws.send(JSON.stringify(message));
}
```

### 3. Receive ACK with Preview

```javascript
function handleACK(ack) {
  if (ack.status === 'COMMIT_RECORDED') {
    // Store preview hash for settlement
    storePreviewHash(ack.ref_id, {
      preview_hash: ack.preview_hash,
      gas_mode: ack.gas_mode,
      settlement_contract: ack.settlement_contract,
      estimated_cost: ack.estimated_total_cost_wei,
      order_state: ack.order_state
    });

    // Display to user
    showPreview(ack);
  }
}
```

### 4. Send SETTLE (After User Approval)

```javascript
async function sendSettle(orderId) {
  const preview = getPreviewHash(orderId);

  const message = {
    type: 'SETTLE',
    tgp_version: '3.4',
    id: uuidv4(),
    nonce: await getNonce(buyerAddress),
    timestamp: Date.now(),
    origin_address: buyerAddress,
    order_id: orderId,
    preview_hash: preview.preview_hash,  // REQUIRED in v3.4
    chain_id: 943
  };

  const signature = await signMessage(message);
  message.signature = signature;

  ws.send(JSON.stringify(message));
}
```

---

## Canonical Signing

See [`signing-flow.md`](./signing-flow.md) for complete implementation details.

### Key Steps

1. **Remove signature field** from message
2. **Sort keys alphabetically** (recursive)
3. **Remove whitespace** from JSON
4. **Compute keccak256 hash** of UTF-8 bytes
5. **Sign with ECDSA secp256k1**
6. **Attach signature** to message

### Example

```javascript
function canonicalize(message) {
  // Remove signature
  const { signature, ...canonical } = message;

  // Sort keys recursively
  const sorted = sortKeysDeep(canonical);

  // Stringify without whitespace
  return JSON.stringify(sorted);
}

async function signMessage(message) {
  const canonical = canonicalize(message);
  const hash = keccak256(toUtf8Bytes(canonical));
  const signature = await wallet.signMessage(arrayify(hash));
  return signature;
}
```

---

## Nonce Management

### Per-Address Nonce Tracking

```javascript
class NonceManager {
  constructor() {
    this.nonces = new Map();  // address → nonce
  }

  async getNonce(address) {
    if (!this.nonces.has(address)) {
      // Initialize from storage or start at 0
      const stored = await loadNonce(address);
      this.nonces.set(address, stored || 0);
    }
    return this.nonces.get(address);
  }

  async incrementNonce(address) {
    const current = await this.getNonce(address);
    const next = current + 1;
    this.nonces.set(address, next);
    await saveNonce(address, next);
    return next;
  }

  async handleNonceTooLow(address, expectedNonce) {
    // Gateway tells us the expected nonce
    this.nonces.set(address, expectedNonce);
    await saveNonce(address, expectedNonce);
  }
}
```

### Recovery from Nonce Errors

```javascript
function handleError(error) {
  if (error.code === 'R200_NONCE_TOO_LOW') {
    // Update local nonce
    nonceManager.handleNonceTooLow(
      error.origin_address,
      error.expected_nonce
    );

    // Retry with correct nonce
    retryMessage();
  }
}
```

---

## Preview Hash Storage

### Storage Requirements

```javascript
interface StoredPreview {
  preview_hash: string;
  order_id: string;
  gas_mode: 'RELAY' | 'WALLET';
  settlement_contract: string;
  estimated_cost_wei: string;
  created_at: number;
  execution_deadline_ms: number;
}

class PreviewStore {
  async store(preview: StoredPreview) {
    // Persist to localStorage, IndexedDB, or other storage
    await db.previews.put(preview.order_id, preview);
  }

  async get(orderId: string): Promise<StoredPreview | null> {
    return await db.previews.get(orderId);
  }

  async isExpired(orderId: string): Promise<boolean> {
    const preview = await this.get(orderId);
    if (!preview) return true;
    return Date.now() > preview.execution_deadline_ms;
  }
}
```

### Expiration Warnings

```javascript
async function checkPreviewExpiration(orderId) {
  const preview = await previewStore.get(orderId);
  const timeRemaining = preview.execution_deadline_ms - Date.now();

  if (timeRemaining < 60000) {  // Less than 1 minute
    showWarning('Preview expires in less than 1 minute');
  }

  if (timeRemaining < 0) {
    showError('Preview has expired. Request new preview.');
    return false;
  }

  return true;
}
```

---

## User Interface Guidelines

### Preview Display

Show users **before** they sign SETTLE:

```
┌─────────────────────────────────────┐
│ Transaction Preview                 │
├─────────────────────────────────────┤
│ Amount:         1.0 ETH             │
│ Recipient:      Acme Store          │
│ Gas Mode:       Relay (free)        │
│ Total Cost:     0.0003 ETH          │
│ Contract:       0x1234...5678       │
│ Expires:        14m 32s             │
├─────────────────────────────────────┤
│ [Cancel]              [Confirm] │
└─────────────────────────────────────┘
```

### Critical Information

- ✅ Amount and asset
- ✅ Recipient/merchant
- ✅ Gas mode (RELAY vs WALLET)
- ✅ Total cost estimate
- ✅ Settlement contract address
- ✅ Time remaining before expiration

---

## Error Handling

### Common Errors

```javascript
function handleError(error) {
  switch (error.code) {
    case 'R200_NONCE_TOO_LOW':
      // Update nonce and retry
      await nonceManager.handleNonceTooLow(
        error.origin_address,
        error.expected_nonce
      );
      break;

    case 'V403_PREVIEW_EXPIRED':
      // Request new preview
      showError('Preview expired. Requesting new preview...');
      await sendNewQuery(error.order_id);
      break;

    case 'V402_PREVIEW_HASH_MISMATCH':
      // Critical: Don't retry, investigate
      showError('Preview mismatch detected. Please refresh.');
      break;

    case 'A100_INVALID_SIGNATURE':
      // Signature generation error
      showError('Signature error. Please try again.');
      break;

    default:
      showError(`Error: ${error.message}`);
  }
}
```

---

## Security Best Practices

### 1. Never Expose Private Keys

```javascript
// ❌ BAD: Don't store or transmit private keys
localStorage.setItem('privateKey', privateKey);

// ✅ GOOD: Use secure key storage
const wallet = await ethers.Wallet.fromEncryptedJson(encrypted, password);
```

### 2. Validate Gateway Responses

```javascript
function validateACK(ack) {
  // Verify required fields
  if (!ack.preview_hash) {
    throw new Error('Missing preview_hash');
  }

  // Verify field types
  if (typeof ack.preview_hash !== 'string') {
    throw new Error('Invalid preview_hash type');
  }

  // Verify hash format
  if (!/^0x[0-9a-f]{64}$/i.test(ack.preview_hash)) {
    throw new Error('Invalid preview_hash format');
  }
}
```

### 3. Implement Timeouts

```javascript
const TIMEOUT_MS = 30000;  // 30 seconds

function sendMessageWithTimeout(message) {
  return Promise.race([
    sendMessage(message),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
    )
  ]);
}
```

### 4. Verify Preview Consistency

```javascript
async function verifyPreview(orderId, displayedAmount) {
  const stored = await previewStore.get(orderId);

  // Ensure user sees what they're signing
  if (stored.amount_wei !== displayedAmount) {
    throw new Error('Amount mismatch detected');
  }
}
```

---

## Complete Example Messages

See [`example-query.json`](./example-query.json) and [`example-settle.json`](./example-settle.json) for complete, valid message examples.

---

## Testing

### Test Scenarios

1. **Happy Path**
   - Connect → QUERY → ACK → SETTLE → ACK
   - Verify preview hash storage
   - Verify nonce increment

2. **Nonce Recovery**
   - Send message with wrong nonce
   - Receive R200 error
   - Update nonce and retry

3. **Preview Expiration**
   - Store preview
   - Wait for expiration
   - Attempt SETTLE
   - Receive V403 error

4. **Connection Loss**
   - Disconnect during transaction
   - Reconnect
   - Resume with stored state

---

## Further Reading

- **[TGP-00 v3.4 Part 1](../../specs/TGP-00-v3.4-Part1.md)** — Core protocol
- **[TGP-00 v3.4 Part 2](../../specs/TGP-00-v3.4-Part2.md)** — Message specifications
- **[TGP-GLOSSARY.md](../../specs/TGP-GLOSSARY.md)** — Term definitions

---

**Note:** This is a reference implementation for educational purposes. Production implementations require thorough security audits and testing.

