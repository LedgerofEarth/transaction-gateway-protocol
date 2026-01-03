# TGP Message Signing Flow

This document provides a detailed, step-by-step guide for implementing TGP message signing.

---

## Overview

TGP uses **EIP-712 typed structured data signing** for economic messages. This ensures:
- Deterministic signature generation
- Cross-implementation compatibility
- Replay attack protection
- Clear user intent display

---

## Signing Process

### Step 1: Build the Message

Create the economic message with all required fields:

```javascript
const message = {
  type: 'QUERY',
  tgp_version: '3.4',
  id: generateUUID(),
  nonce: await getNonce(address),
  timestamp: Date.now(),
  origin_address: address,
  intent: {
    verb: 'COMMIT',
    party: 'BUYER',
    mode: 'DIRECT',
    payload: {
      order_id: 'ORD-123',
      amount_wei: '1000000000000000000',
      asset: 'NATIVE',
      merchant_id: 'merchant-xyz'
    }
  },
  chain_id: 943
};
```

**Important:** Do NOT include `signature` field yet.

---

### Step 2: Canonicalize the Message

Canonicalization ensures byte-for-byte identical hashing across implementations.

#### 2a. Remove Signature Field

```javascript
const { signature, ...canonical } = message;
```

#### 2b. Sort Keys Alphabetically (Recursive)

```javascript
function sortKeysDeep(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }

  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortKeysDeep(obj[key]);
      return sorted;
    }, {});
}

const sorted = sortKeysDeep(canonical);
```

#### 2c. Stringify Without Whitespace

```javascript
const canonicalJSON = JSON.stringify(sorted);
```

**Example Output:**

```json
{"chain_id":943,"id":"uuid-123","intent":{"mode":"DIRECT","party":"BUYER","payload":{"amount_wei":"1000000000000000000","asset":"NATIVE","merchant_id":"merchant-xyz","order_id":"ORD-123"},"verb":"COMMIT"},"nonce":42,"origin_address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","tgp_version":"3.4","type":"QUERY"}
```

---

### Step 3: Compute Hash

```javascript
import { keccak256, toUtf8Bytes } from 'ethers';

const hash = keccak256(toUtf8Bytes(canonicalJSON));
```

**Result:** 32-byte keccak256 hash (0x-prefixed hex string)

---

### Step 4: Sign the Hash

```javascript
import { Wallet } from 'ethers';

const wallet = new Wallet(privateKey);
const signature = await wallet.signMessage(arrayify(hash));
```

**Signature Format:**
- 65 bytes: {r (32), s (32), v (1)}
- Hex-encoded with 0x prefix
- Example: `0x1234...5678`

---

### Step 5: Attach Signature

```javascript
message.signature = signature;
```

**Complete Signed Message:**

```json
{
  "type": "QUERY",
  "tgp_version": "3.4",
  "id": "uuid-123",
  "nonce": 42,
  "timestamp": 1704067200000,
  "origin_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "intent": { ... },
  "chain_id": 943,
  "signature": "0x1234...5678"
}
```

---

## Verification (Gateway Side)

Gateways verify signatures by:

1. **Remove signature** from received message
2. **Rebuild canonical form** (same sorting/stringify logic)
3. **Recompute hash**
4. **Recover signer** from signature
5. **Compare** recovered address to `origin_address`

```javascript
function verifySignature(message) {
  // 1. Remove signature
  const { signature, ...canonical } = message;

  // 2. Canonicalize
  const sorted = sortKeysDeep(canonical);
  const canonicalJSON = JSON.stringify(sorted);

  // 3. Hash
  const hash = keccak256(toUtf8Bytes(canonicalJSON));

  // 4. Recover signer
  const recoveredAddress = recoverAddress(hash, signature);

  // 5. Verify
  if (recoveredAddress.toLowerCase() !== message.origin_address.toLowerCase()) {
    throw new Error('Signature does not match origin_address');
  }

  return true;
}
```

---

## Complete Implementation Example

```javascript
import { Wallet, keccak256, toUtf8Bytes, arrayify, recoverAddress } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

class TGPSigner {
  constructor(wallet) {
    this.wallet = wallet;
    this.nonces = new Map();
  }

  // Canonicalize message
  canonicalize(message) {
    const { signature, ...canonical } = message;
    return JSON.stringify(this.sortKeysDeep(canonical));
  }

  // Recursive key sorting
  sortKeysDeep(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sortKeysDeep(item));

    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = this.sortKeysDeep(obj[key]);
        return sorted;
      }, {});
  }

  // Get nonce for address
  async getNonce(address) {
    if (!this.nonces.has(address)) {
      this.nonces.set(address, 0);
    }
    return this.nonces.get(address);
  }

  // Increment nonce
  async incrementNonce(address) {
    const current = await this.getNonce(address);
    this.nonces.set(address, current + 1);
  }

  // Sign message
  async sign(message) {
    // Ensure no signature field
    delete message.signature;

    // Canonicalize
    const canonical = this.canonicalize(message);

    // Hash
    const hash = keccak256(toUtf8Bytes(canonical));

    // Sign
    const signature = await this.wallet.signMessage(arrayify(hash));

    // Attach signature
    message.signature = signature;

    return message;
  }

  // Build and sign QUERY
  async buildQuery(intent, chainId) {
    const address = await this.wallet.getAddress();

    const message = {
      type: 'QUERY',
      tgp_version: '3.4',
      id: uuidv4(),
      nonce: await this.getNonce(address),
      timestamp: Date.now(),
      origin_address: address,
      intent: intent,
      chain_id: chainId
    };

    const signed = await this.sign(message);
    await this.incrementNonce(address);

    return signed;
  }

  // Build and sign SETTLE
  async buildSettle(orderId, previewHash, chainId) {
    const address = await this.wallet.getAddress();

    const message = {
      type: 'SETTLE',
      tgp_version: '3.4',
      id: uuidv4(),
      nonce: await this.getNonce(address),
      timestamp: Date.now(),
      origin_address: address,
      order_id: orderId,
      preview_hash: previewHash,
      chain_id: chainId
    };

    const signed = await this.sign(message);
    await this.incrementNonce(address);

    return signed;
  }
}

// Usage
const wallet = new Wallet(privateKey);
const signer = new TGPSigner(wallet);

const query = await signer.buildQuery({
  verb: 'COMMIT',
  party: 'BUYER',
  mode: 'DIRECT',
  payload: {
    order_id: 'ORD-123',
    amount_wei: '1000000000000000000',
    asset: 'NATIVE',
    merchant_id: 'merchant-xyz'
  }
}, 943);

console.log(query);
```

---

## Testing Signature Generation

### Test Vector

**Input Message (before signing):**

```json
{
  "type": "QUERY",
  "tgp_version": "3.4",
  "id": "test-uuid-123",
  "nonce": 1,
  "timestamp": 1704067200000,
  "origin_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "intent": {
    "verb": "COMMIT",
    "party": "BUYER",
    "mode": "DIRECT",
    "payload": {
      "order_id": "TEST-001",
      "amount_wei": "1000000000000000000",
      "asset": "NATIVE",
      "merchant_id": "test-merchant"
    }
  },
  "chain_id": 943
}
```

**Canonical Form:**

```json
{"chain_id":943,"id":"test-uuid-123","intent":{"mode":"DIRECT","party":"BUYER","payload":{"amount_wei":"1000000000000000000","asset":"NATIVE","merchant_id":"test-merchant","order_id":"TEST-001"},"verb":"COMMIT"},"nonce":1,"origin_address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","timestamp":1704067200000,"tgp_version":"3.4","type":"QUERY"}
```

Use this to verify your implementation produces identical canonical forms.

---

## Common Pitfalls

### ❌ Including Signature in Hash

```javascript
// WRONG: Don't hash the signature
const hash = keccak256(JSON.stringify(message));
```

```javascript
// CORRECT: Remove signature before hashing
const { signature, ...canonical } = message;
const hash = keccak256(JSON.stringify(canonical));
```

---

### ❌ Unsorted Keys

```javascript
// WRONG: Keys in random order
const json = JSON.stringify(message);
```

```javascript
// CORRECT: Sort keys alphabetically
const sorted = sortKeysDeep(message);
const json = JSON.stringify(sorted);
```

---

### ❌ Including Whitespace

```javascript
// WRONG: Pretty-printed JSON
const json = JSON.stringify(message, null, 2);
```

```javascript
// CORRECT: No whitespace
const json = JSON.stringify(message);
```

---

### ❌ Using Wrong Hash Function

```javascript
// WRONG: SHA-256
const hash = sha256(canonicalJSON);
```

```javascript
// CORRECT: keccak256
const hash = keccak256(toUtf8Bytes(canonicalJSON));
```

---

## Further Reading

- **[TGP-00 v3.4 Part 1, Section 8](../../specs/TGP-00-v3.4-Part1.md#8-canonical-hashing--signatures)** — Canonical hashing specification
- **[EIP-712](https://eips.ethereum.org/EIPS/eip-712)** — Typed structured data hashing
- **[ethers.js Documentation](https://docs.ethers.org)** — JavaScript Ethereum library

---

**Note:** Always test signature generation with known test vectors before production use.

