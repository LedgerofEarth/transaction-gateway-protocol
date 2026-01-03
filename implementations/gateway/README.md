# TGP Gateway Reference Implementation

A TGP gateway is a service that validates transaction intents, generates previews, and coordinates settlement execution while never holding user private keys.

---

## Overview

### Gateway Responsibilities

1. **Message Validation** — Verify signatures and replay protection
2. **Preview Generation** — Create cryptographically committed transaction previews
3. **State Management** — Track commitments and preview consumption
4. **Settlement Coordination** — Route validated transactions to executors
5. **Non-Custodial Operation** — Never hold or control user keys

### Gateway Does NOT

- ❌ Hold user private keys
- ❌ Modify transaction parameters
- ❌ Sign messages on behalf of users
- ❌ Custody funds
- ❌ Bypass verification steps

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Gateway                        │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────┐       ┌──────────────┐        │
│  │  WebSocket  │──────▶│  Validator   │        │
│  │   Handler   │       │   Pipeline   │        │
│  └─────────────┘       └──────┬───────┘        │
│                               │                  │
│  ┌─────────────┐       ┌──────▼───────┐        │
│  │   Preview   │◀──────│   Routing    │        │
│  │  Generator  │       │    Engine    │        │
│  └─────────────┘       └──────┬───────┘        │
│                               │                  │
│  ┌─────────────┐       ┌──────▼───────┐        │
│  │  Commitment │       │  Settlement  │        │
│  │    Store    │       │   Executor   │        │
│  └─────────────┘       └──────────────┘        │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Message Validation Pipeline

See [`validation-pipeline.md`](./validation-pipeline.md) for complete details.

### Validation Steps

1. **Parse JSON** — Validate message structure
2. **Verify Signature** — Recover signer, match origin_address
3. **Check Replay Protection** — Nonce, timestamp, UUID
4. **Validate Schema** — Required fields present
5. **Route Message** — Send to appropriate handler

```javascript
async function validateMessage(message) {
  // 1. Parse
  const parsed = JSON.parse(message);

  // 2. Verify signature (for economic messages)
  if (requiresSignature(parsed.type)) {
    const recoveredAddress = await verifySignature(parsed);
    if (recoveredAddress !== parsed.origin_address.toLowerCase()) {
      throw new Error('A101_ADDRESS_MISMATCH');
    }
  }

  // 3. Check replay protection
  await checkReplayProtection(parsed);

  // 4. Validate schema
  validateSchema(parsed);

  return parsed;
}
```

---

## Preview Generation

See [`preview-lifecycle.md`](./preview-lifecycle.md) for complete flow.

### Preview Components

```javascript
class PreviewGenerator {
  async generate(query) {
    // 1. Resolve settlement contract
    const contract = await this.resolveSettlementContract(
      query.intent.payload.merchant_id,
      query.chain_id
    );

    // 2. Determine gas mode
    const gasMode = await this.determineGasMode(
      query.force_wallet,
      query.intent.payload.amount_wei
    );

    // 3. Estimate gas
    const gasEstimate = await this.estimateGas(contract, query);

    // 4. Generate preview
    const preview = {
      order_id: query.intent.payload.order_id,
      merchant_id: query.intent.payload.merchant_id,
      amount_wei: query.intent.payload.amount_wei,
      asset: this.resolveAsset(query.intent.payload.asset),
      asset_type: 'NATIVE',
      seller: await this.getSellerAddress(query.intent.payload.merchant_id),
      chain_id: query.chain_id,
      execution_deadline_ms: Date.now() + (15 * 60 * 1000), // 15 min
      risk_score: 0.0,
      settlement_contract: contract,
      gas_mode: gasMode,
      gas_estimate: gasEstimate,
      preview_version: '1.0',
      preview_source: 'gateway-v1',
      preview_nonce: generatePreviewNonce()
    };

    // 5. Compute preview hash
    preview.preview_hash = this.computePreviewHash(preview);

    // 6. Store preview
    await this.storePreview(preview);

    return preview;
  }

  computePreviewHash(preview) {
    // Canonical fields only (no gas_mode, no preview_hash)
    const canonical = {
      amount_wei: preview.amount_wei,
      asset: preview.asset.toLowerCase(),
      asset_type: preview.asset_type,
      chain_id: preview.chain_id,
      execution_deadline_ms: preview.execution_deadline_ms,
      gas_estimate: {
        execution_gas_limit: preview.gas_estimate.execution_gas_limit,
        max_fee_per_gas_wei: preview.gas_estimate.max_fee_per_gas_wei,
        total_cost_wei: preview.gas_estimate.total_cost_wei
      },
      merchant_id: preview.merchant_id,
      order_id: preview.order_id,
      preview_nonce: preview.preview_nonce,
      preview_source: preview.preview_source,
      preview_version: preview.preview_version,
      risk_score: preview.risk_score,
      seller: preview.seller.toLowerCase(),
      settlement_contract: preview.settlement_contract.toLowerCase()
    };

    const canonicalJSON = JSON.stringify(this.sortKeysDeep(canonical));
    return keccak256(toUtf8Bytes(canonicalJSON));
  }
}
```

---

## Routing Logic

See [`routing-flow.md`](./routing-flow.md) for complete implementation.

### Message Routing

```javascript
class MessageRouter {
  async route(message) {
    switch (message.type) {
      case 'PING':
        return await this.handlePing(message);

      case 'QUERY':
        return await this.handleQuery(message);

      case 'SETTLE':
        return await this.handleSettle(message);

      case 'WITHDRAW':
        return await this.handleWithdraw(message);

      case 'PREVIEW':
        return await this.handlePreviewRequest(message);

      case 'VALIDATE':
        return await this.handleValidate(message);

      default:
        throw new Error('P003_INVALID_TYPE');
    }
  }

  async handleQuery(query) {
    // 1. Generate preview
    const preview = await this.previewGenerator.generate(query);

    // 2. Update commitment state
    await this.commitmentStore.recordCommitment(
      query.intent.payload.order_id,
      query.intent.party,
      query.origin_address
    );

    // 3. Return ACK with preview
    return {
      type: 'ACK',
      tgp_version: '3.4',
      ref_id: query.id,
      status: 'COMMIT_RECORDED',
      timestamp: Date.now(),
      preview_hash: preview.preview_hash,
      gas_mode: preview.gas_mode,
      settlement_contract: preview.settlement_contract,
      estimated_total_cost_wei: preview.gas_estimate.total_cost_wei,
      order_state: await this.commitmentStore.getState(query.intent.payload.order_id)
    };
  }

  async handleSettle(settle) {
    // 1. Load preview
    const preview = await this.previewStore.get(settle.order_id);
    if (!preview) {
      throw new Error('V401_PREVIEW_NOT_FOUND');
    }

    // 2. Verify preview hash
    if (settle.preview_hash !== preview.preview_hash) {
      throw new Error('V402_PREVIEW_HASH_MISMATCH');
    }

    // 3. Check expiration
    if (Date.now() > preview.execution_deadline_ms) {
      throw new Error('V403_PREVIEW_EXPIRED');
    }

    // 4. Check not consumed
    if (preview.consumed) {
      throw new Error('V404_PREVIEW_ALREADY_CONSUMED');
    }

    // 5. Mark executing (prevents concurrent settlement)
    await this.previewStore.markExecuting(settle.order_id);

    // 6. Route to executor
    const txHash = await this.executor.execute(preview, settle);

    // 7. Mark consumed
    await this.previewStore.markConsumed(settle.order_id);

    // 8. Return ACK
    return {
      type: 'ACK',
      tgp_version: '3.4',
      ref_id: settle.id,
      status: 'EXECUTED',
      timestamp: Date.now(),
      tx_hash: txHash
    };
  }
}
```

---

## State Management

### Commitment Store

```javascript
class CommitmentStore {
  async recordCommitment(orderId, party, address) {
    const state = await this.getState(orderId) || {
      buyer_committed: false,
      seller_committed: false,
      buyer_address: null,
      seller_address: null
    };

    if (party === 'BUYER') {
      state.buyer_committed = true;
      state.buyer_address = address;
    } else if (party === 'SELLER') {
      state.seller_committed = true;
      state.seller_address = address;
    }

    await this.setState(orderId, state);
    return state;
  }

  async getState(orderId) {
    return await this.db.commitments.get(orderId);
  }

  async setState(orderId, state) {
    await this.db.commitments.put(orderId, state);
  }
}
```

### Preview Store

```javascript
class PreviewStore {
  async store(preview) {
    await this.db.previews.put(preview.order_id, {
      preview,
      consumed: false,
      executing: false,
      created_at: Date.now()
    });
  }

  async get(orderId) {
    const record = await this.db.previews.get(orderId);
    return record?.preview;
  }

  async markExecuting(orderId) {
    const record = await this.db.previews.get(orderId);
    if (record.executing) {
      throw new Error('V406_PREVIEW_EXECUTION_IN_PROGRESS');
    }
    record.executing = true;
    await this.db.previews.put(orderId, record);
  }

  async markConsumed(orderId) {
    const record = await this.db.previews.get(orderId);
    record.consumed = true;
    record.executing = false;
    await this.db.previews.put(orderId, record);
  }
}
```

---

## Replay Protection

### Nonce Tracking

```javascript
class NonceTracker {
  async validate(address, nonce) {
    const lastSeen = await this.getLastNonce(address);

    if (nonce <= lastSeen) {
      throw {
        code: 'R200_NONCE_TOO_LOW',
        expected_nonce: lastSeen + 1,
        received_nonce: nonce
      };
    }

    await this.setLastNonce(address, nonce);
  }

  async getLastNonce(address) {
    return (await this.db.nonces.get(address)) || 0;
  }

  async setLastNonce(address, nonce) {
    await this.db.nonces.put(address, nonce);
  }
}
```

### Timestamp Validation

```javascript
function validateTimestamp(timestamp) {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  const oneMinuteFromNow = now + (1 * 60 * 1000);

  if (timestamp < fiveMinutesAgo) {
    throw {
      code: 'R202_TIMESTAMP_TOO_OLD',
      server_time: now,
      your_timestamp: timestamp,
      age_ms: now - timestamp
    };
  }

  if (timestamp > oneMinuteFromNow) {
    throw {
      code: 'R203_TIMESTAMP_TOO_NEW',
      server_time: now,
      your_timestamp: timestamp
    };
  }
}
```

### UUID Deduplication

```javascript
class UUIDTracker {
  async checkAndStore(uuid) {
    if (await this.has(uuid)) {
      throw { code: 'R204_MESSAGE_ID_DUPLICATE' };
    }

    await this.store(uuid);
  }

  async has(uuid) {
    return await this.db.uuids.has(uuid);
  }

  async store(uuid) {
    await this.db.uuids.put(uuid, Date.now());
  }

  // Garbage collect old UUIDs (run periodically)
  async cleanup() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    await this.db.uuids.where('timestamp').below(oneDayAgo).delete();
  }
}
```

---

## Settlement Execution

### Executor Interface

```javascript
class SettlementExecutor {
  async execute(preview, settleMessage) {
    // 1. Build transaction envelope
    const tx = await this.buildTransaction(preview);

    // 2. Determine execution mode
    if (preview.gas_mode === 'RELAY') {
      return await this.executeWithRelay(tx);
    } else {
      return await this.executeWithUserGas(tx, settleMessage);
    }
  }

  async buildTransaction(preview) {
    // Build settlement transaction from preview
    return {
      to: preview.settlement_contract,
      value: preview.amount_wei,
      data: this.encodeSettlement(preview),
      gasLimit: preview.gas_estimate.execution_gas_limit,
      maxFeePerGas: preview.gas_estimate.max_fee_per_gas_wei
    };
  }

  async executeWithRelay(tx) {
    // Gateway pays gas
    const wallet = this.relayWallet;
    const txResponse = await wallet.sendTransaction(tx);
    return txResponse.hash;
  }

  async executeWithUserGas(tx, settleMessage) {
    // User pays gas (transaction already signed by user)
    // Forward to RPC provider
    const txHash = await this.provider.sendRawTransaction(
      settleMessage.signed_transaction
    );
    return txHash;
  }
}
```

---

## Error Handling

### Error Response Format

```javascript
function createError(code, details = {}) {
  return {
    type: 'ERROR',
    code,
    message: getErrorMessage(code),
    ...details,
    timestamp: Date.now()
  };
}

// Usage
try {
  await validateMessage(message);
} catch (error) {
  ws.send(JSON.stringify(createError(error.code, error)));
}
```

---

## Security Best Practices

### 1. Never Hold Private Keys

```javascript
// ❌ NEVER do this
const userPrivateKey = message.private_key;

// ✅ Only verify signatures
const recoveredAddress = recoverAddress(hash, signature);
```

### 2. Validate Everything

```javascript
async function validateSettle(settle) {
  // Verify all required fields
  assert(settle.preview_hash, 'Missing preview_hash');
  assert(settle.order_id, 'Missing order_id');

  // Verify field formats
  assert(/^0x[0-9a-f]{64}$/i.test(settle.preview_hash), 'Invalid preview_hash');

  // Verify preview exists
  const preview = await previewStore.get(settle.order_id);
  assert(preview, 'Preview not found');

  // Verify preview matches
  assert(preview.preview_hash === settle.preview_hash, 'Preview mismatch');
}
```

### 3. Rate Limiting

```javascript
class RateLimiter {
  async checkLimit(address, action) {
    const key = `${address}:${action}`;
    const count = await this.getCount(key);

    if (count > this.limits[action]) {
      throw { code: 'L500_RATE_LIMITED' };
    }

    await this.increment(key);
  }

  limits = {
    QUERY: 100,     // per hour
    SETTLE: 50,     // per hour
    PREVIEW: 200    // per hour
  };
}
```

---

## Further Reading

- **[validation-pipeline.md](./validation-pipeline.md)** — Complete validation logic
- **[preview-lifecycle.md](./preview-lifecycle.md)** — Preview generation and management
- **[routing-flow.md](./routing-flow.md)** — Message routing implementation
- **[TGP-00 v3.4 Specification](../../specs/TGP-00-v3.4-README.md)** — Complete protocol spec

---

**Note:** This is a reference implementation for educational purposes. Production gateways require additional security hardening, monitoring, and testing.

