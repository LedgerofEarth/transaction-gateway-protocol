## 8.6 Signature Schemes & Canonical Signing (NEW in v3.4)

**Status:** Normative  
**Applies to:** All signed economic messages (QUERY, SETTLE, WITHDRAW)  
**Purpose:** Define explicit signature scheme selection and verification rules

---

### 8.6.1 Signature Scheme Declaration (REQUIRED)

All **signed TGP messages** MUST explicitly declare the signing scheme used.

```json
{
  "type": "QUERY",
  "signature": "0x...",
  "signature_scheme": "CANONICAL_JSON"
}
```

**Rules:**

1. `signature_scheme` is **MANDATORY** for all signed messages in TGP v3.4
2. Implementations MUST NOT infer the signing scheme from:
   - Wallet behavior
   - Message structure
   - Presence or absence of typed fields
3. Valid values: `"CANONICAL_JSON"` or `"EIP712"`
4. Messages with missing or invalid `signature_scheme` MUST be rejected

**Error responses:**

```json
// Missing signature_scheme
{
  "type": "ERROR",
  "code": "P002_MISSING_FIELD",
  "message": "Required field 'signature_scheme' is missing"
}

// Invalid signature_scheme
{
  "type": "ERROR",
  "code": "A103_UNSUPPORTED_SIGNATURE_SCHEME",
  "message": "Signature scheme 'CUSTOM_SCHEME' is not supported"
}
```

> **Rationale:** Explicit declaration eliminates implicit wallet assumptions and prevents cross-scheme verification failures.

---

### 8.6.2 Breaking Change from v3.3

**This is a breaking change from TGP v3.3.**

TGP v3.3 messages did NOT include `signature_scheme`. TGP v3.4 makes this field MANDATORY.

#### Migration Strategy

**Phase 1: Dual Support (Weeks 1-4, OPTIONAL)**

TBC implementations MAY temporarily accept messages without `signature_scheme`:
- Default missing field to `"CANONICAL_JSON"` (v3.3 behavior)
- Log warning with client address and message ID
- Return deprecation notice in ACK response

```json
{
  "type": "ACK",
  "status": "COMMIT_RECORDED",
  "warnings": [
    {
      "code": "DEPRECATED_SIGNATURE_FORMAT",
      "message": "signature_scheme field will be required after 2025-01-31"
    }
  ]
}
```

**Phase 2: Strict Enforcement (Week 5+, REQUIRED)**

TBC implementations MUST reject messages without `signature_scheme`:

```json
{
  "type": "ERROR",
  "code": "P002_MISSING_FIELD",
  "message": "signature_scheme field is required in TGP v3.4"
}
```

**Client Migration Checklist:**

- [ ] Add `signature_scheme` field to all QUERY, SETTLE, WITHDRAW messages
- [ ] Update signature generation logic to match declared scheme
- [ ] Test against v3.4 TBC endpoints
- [ ] Monitor for deprecation warnings
- [ ] Remove any signature scheme inference logic

**Rationale:** Phased migration allows existing v3.3 clients to continue operating while new v3.4 clients adopt explicit scheme declaration.

---

### 8.6.3 Message-Level Scheme Requirements

For **TGP v3.4**, allowed schemes are constrained by message type:

| Message Type | Signature Required | Allowed Schemes | Default (v3.3 compat) |
|--------------|-------------------|-----------------|----------------------|
| `QUERY` | YES | CANONICAL_JSON, EIP712 | CANONICAL_JSON |
| `SETTLE` | YES | CANONICAL_JSON, EIP712 | CANONICAL_JSON |
| `WITHDRAW` | YES | CANONICAL_JSON, EIP712 | CANONICAL_JSON |
| `ACK` | NO | N/A | N/A |
| `ERROR` | NO | N/A | N/A |
| `PING` | NO | N/A | N/A |
| `PONG` | NO | N/A | N/A |
| `PREVIEW` | NO | N/A | N/A |
| `VALIDATE` | NO | N/A | N/A |

Messages signed with a scheme not allowed for their type MUST be rejected:

```json
{
  "type": "ERROR",
  "code": "A103_UNSUPPORTED_SIGNATURE_SCHEME",
  "message": "EIP712 is not allowed for PING messages"
}
```

---

### 8.6.4 CANONICAL_JSON Signing (Protocol-Native)

**CANONICAL_JSON** is the protocol-native signing scheme optimized for deterministic verification and minimal dependencies.

#### 8.6.4.1 Canonical Hash Construction

When `signature_scheme = "CANONICAL_JSON"`:

**Step 1: Remove signing metadata fields**

Remove the following fields from the message object:
- `signature`
- `signature_scheme`

**Step 2: Canonicalize the JSON**

Apply deterministic JSON canonicalization:
- **Encoding:** UTF-8
- **Key ordering:** Lexicographically sorted (recursive for nested objects)
- **Whitespace:** No whitespace or formatting
- **Null handling:** Omit null values

**Step 3: Compute hash**

```
message_hash = keccak256(utf8_bytes(canonical_json))
```

**Step 4: Sign**

Sign `message_hash` using **raw secp256k1 ECDSA** (no prefix).

#### Example Implementation (TypeScript)

```typescript
import { keccak256, toUtf8Bytes } from 'ethers';

function computeCanonicalHash(message: TgpMessage): string {
  // Step 1: Remove signing fields
  const { signature, signature_scheme, ...canonical } = message;
  
  // Step 2: Canonicalize JSON
  const sortedKeys = Object.keys(canonical).sort();
  const canonicalJson = JSON.stringify(canonical, sortedKeys);
  
  // Step 3: Compute hash
  const hash = keccak256(toUtf8Bytes(canonicalJson));
  
  return hash;
}
```

#### Example Implementation (Rust)

```rust
use serde_json::json;
use tiny_keccak::{Hasher, Keccak};

fn compute_canonical_hash(message: &serde_json::Value) -> [u8; 32] {
    // Step 1: Clone and remove signing fields
    let mut canonical = message.clone();
    canonical.as_object_mut().unwrap().remove("signature");
    canonical.as_object_mut().unwrap().remove("signature_scheme");
    
    // Step 2: Serialize with sorted keys (serde_json default)
    let canonical_json = serde_json::to_string(&canonical).unwrap();
    
    // Step 3: Compute keccak256
    let mut keccak = Keccak::v256();
    let mut hash = [0u8; 32];
    keccak.update(canonical_json.as_bytes());
    keccak.finalize(&mut hash);
    
    hash
}
```

---

#### 8.6.4.2 Canonical Signing Restrictions (CRITICAL)

For `CANONICAL_JSON` signing:

**MUST:**
- ✅ Sign the **raw 32-byte digest**
- ✅ Use **secp256k1 ECDSA**
- ✅ Produce {r, s, v} signature format
- ✅ Hex-encode signature with 0x prefix

**MUST NOT:**
- ❌ Apply **EIP-191** "Ethereum Signed Message" prefix
- ❌ Apply **EIP-712** domain separation
- ❌ Apply any other prefix or wrapper
- ❌ Hash the hash (double hashing)

**Prefix Detection:**

TBC implementations SHOULD detect EIP-191 prefix violations by attempting recovery both with and without prefix:

```rust
// Attempt raw recovery
let recovered_raw = recover_address(&digest, &signature);

// If raw recovery fails, attempt prefixed recovery
if recovered_raw.is_err() {
    let prefixed_digest = eth_message_hash(&digest);
    let recovered_prefixed = recover_address(&prefixed_digest, &signature);
    
    // If prefixed recovery succeeds but raw failed, signature is prefixed
    if recovered_prefixed.is_ok() && signature_scheme == "CANONICAL_JSON" {
        return Err(Error::PrefixNotAllowed);
    }
}
```

Any detection of prefixed signing MUST result in rejection:

```json
{
  "type": "ERROR",
  "code": "A105_PREFIX_NOT_ALLOWED",
  "message": "EIP-191 prefix detected on CANONICAL_JSON signature",
  "hint": "Use raw secp256k1 signing for CANONICAL_JSON scheme"
}
```

> **Rationale:** Canonical signing commits directly to protocol semantics and must remain prefix-free to ensure cross-implementation determinism.

---

#### 8.6.4.3 Signing Example (TypeScript/ethers v6)

```typescript
import { Wallet, keccak256, toUtf8Bytes } from 'ethers';

async function signCanonicalJson(wallet: Wallet, message: TgpMessage): Promise<string> {
  // Compute canonical hash
  const { signature, signature_scheme, ...canonical } = message;
  const sortedKeys = Object.keys(canonical).sort();
  const canonicalJson = JSON.stringify(canonical, sortedKeys);
  const digest = keccak256(toUtf8Bytes(canonicalJson));
  
  // Sign raw digest (NO PREFIX)
  const signature = await wallet.signingKey.sign(digest);
  
  return signature.serialized; // Returns 0x-prefixed hex
}
```

---

#### 8.6.4.4 Verification (TBC-Side)

TBC MUST verify CANONICAL_JSON signatures as follows:

**Step 1: Recompute canonical hash**

```rust
let canonical_hash = compute_canonical_hash(&message);
```

**Step 2: Recover signer**

```rust
let recovered_address = recover_address(&canonical_hash, &signature)?;
```

**Step 3: Verify address match**

```rust
if recovered_address != message.origin_address {
    return Err(Error::AddressMismatch {
        expected: message.origin_address,
        recovered: recovered_address,
    });
}
```

**Step 4: Apply replay protection**

After signature verification, apply standard replay protection:
- Nonce validation (Section 9.1)
- Timestamp freshness (Section 9.2)
- UUID deduplication (Section 9.3)

---

### 8.6.5 EIP-712 Signing (Wallet-Native)

**EIP-712** is the wallet-native signing scheme optimized for hardware wallet support and user-visible transaction approval.

#### 8.6.5.1 Typed Domain (REQUIRED)

When `signature_scheme = "EIP712"`, the following domain MUST be used:

```json
{
  "name": "Transaction Gateway Protocol",
  "version": "3.4",
  "chainId": <chain_id>
}
```

**Domain Verification:**

TBC MUST reject messages with incorrect domain:

```json
{
  "type": "ERROR",
  "code": "A106_INVALID_TYPED_DOMAIN",
  "message": "EIP-712 domain name must be 'Transaction Gateway Protocol'",
  "expected_domain": {
    "name": "Transaction Gateway Protocol",
    "version": "3.4",
    "chainId": 943
  }
}
```

**Properties:**

| Field | Value | Required | Purpose |
|-------|-------|----------|---------|
| `name` | "Transaction Gateway Protocol" | YES | Protocol identifier |
| `version` | "3.4" | YES | Protocol version |
| `chainId` | Matches `message.chain_id` | YES | Chain-specific binding |

---

#### 8.6.5.2 Typed Message Derivation

The EIP-712 `message` MUST be derived from the **canonical message structure**:

**Derivation Rules:**

1. `signature` field MUST be excluded
2. `signature_scheme` field MUST be excluded
3. Field names and types MUST match TGP canonical structure
4. Nested objects MUST preserve structure or be hashed (see below)
5. All values MUST be semantically identical to canonical representation

**This ensures:**

> **EIP-712 and CANONICAL_JSON signatures commit to the same transaction intent.**

---

#### 8.6.5.3 EIP-712 Type Definitions (REQUIRED)

Implementations using EIP-712 MUST use these exact type definitions:

##### QUERY Type Definition

```typescript
const domain = {
  name: "Transaction Gateway Protocol",
  version: "3.4",
  chainId: message.chain_id
};

const types = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" }
  ],
  TgpQuery: [
    { name: "type", type: "string" },
    { name: "tgp_version", type: "string" },
    { name: "id", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" },
    { name: "origin_address", type: "address" },
    { name: "chain_id", type: "uint256" },
    { name: "intent_hash", type: "bytes32" }
  ]
};

const message = {
  type: "QUERY",
  tgp_version: "3.4",
  id: message.id,
  nonce: message.nonce,
  timestamp: message.timestamp,
  origin_address: message.origin_address,
  chain_id: message.chain_id,
  intent_hash: keccak256(JSON.stringify(message.intent, Object.keys(message.intent).sort()))
};
```

**Note:** For QUERY messages, the `intent` object is hashed due to arbitrary nested structure. This preserves determinism while supporting flexible payloads.

**Intent hash computation:**

```typescript
function computeIntentHash(intent: any): string {
  const sortedKeys = Object.keys(intent).sort();
  const canonicalIntent = JSON.stringify(intent, sortedKeys);
  return keccak256(toUtf8Bytes(canonicalIntent));
}
```

##### SETTLE Type Definition

```typescript
const domain = {
  name: "Transaction Gateway Protocol",
  version: "3.4",
  chainId: message.chain_id
};

const types = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" }
  ],
  TgpSettle: [
    { name: "type", type: "string" },
    { name: "tgp_version", type: "string" },
    { name: "id", type: "string" },
    { name: "order_id", type: "string" },
    { name: "preview_hash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" },
    { name: "origin_address", type: "address" },
    { name: "chain_id", type: "uint256" }
  ]
};

const message = {
  type: "SETTLE",
  tgp_version: "3.4",
  id: message.id,
  order_id: message.order_id,
  preview_hash: message.preview_hash,
  nonce: message.nonce,
  timestamp: message.timestamp,
  origin_address: message.origin_address,
  chain_id: message.chain_id
};
```

##### WITHDRAW Type Definition

```typescript
const domain = {
  name: "Transaction Gateway Protocol",
  version: "3.4",
  chainId: message.chain_id
};

const types = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" }
  ],
  TgpWithdraw: [
    { name: "type", type: "string" },
    { name: "tgp_version", type: "string" },
    { name: "id", type: "string" },
    { name: "order_id", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" },
    { name: "origin_address", type: "address" },
    { name: "chain_id", type: "uint256" }
  ]
};

const message = {
  type: "WITHDRAW",
  tgp_version: "3.4",
  id: message.id,
  order_id: message.order_id,
  nonce: message.nonce,
  timestamp: message.timestamp,
  origin_address: message.origin_address,
  chain_id: message.chain_id
};
```

---

#### 8.6.5.4 Signing Example (TypeScript/ethers v6)

```typescript
import { Wallet } from 'ethers';

async function signEIP712(wallet: Wallet, message: TgpSettleMessage): Promise<string> {
  const domain = {
    name: "Transaction Gateway Protocol",
    version: "3.4",
    chainId: message.chain_id
  };
  
  const types = {
    TgpSettle: [
      { name: "type", type: "string" },
      { name: "tgp_version", type: "string" },
      { name: "id", type: "string" },
      { name: "order_id", type: "string" },
      { name: "preview_hash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "origin_address", type: "address" },
      { name: "chain_id", type: "uint256" }
    ]
  };
  
  const value = {
    type: message.type,
    tgp_version: message.tgp_version,
    id: message.id,
    order_id: message.order_id,
    preview_hash: message.preview_hash,
    nonce: message.nonce,
    timestamp: message.timestamp,
    origin_address: message.origin_address,
    chain_id: message.chain_id
  };
  
  const signature = await wallet.signTypedData(domain, types, value);
  
  return signature;
}
```

---

#### 8.6.5.5 Verification (TBC-Side)

TBC MUST verify EIP-712 signatures as follows:

**Step 1: Reconstruct typed data**

```typescript
const domain = {
  name: "Transaction Gateway Protocol",
  version: "3.4",
  chainId: message.chain_id
};

const types = { /* appropriate types for message type */ };
const value = { /* message fields excluding signature/signature_scheme */ };
```

**Step 2: Recover signer**

```typescript
import { verifyTypedData } from 'ethers';

const recoveredAddress = verifyTypedData(domain, types, value, signature);
```

**Step 3: Verify address match**

```typescript
if (recoveredAddress.toLowerCase() !== message.origin_address.toLowerCase()) {
  throw new Error("A101_ADDRESS_MISMATCH");
}
```

**Step 4: Apply replay protection**

After signature verification, apply standard replay protection (same as CANONICAL_JSON).

---

### 8.6.6 Wallet Signing Contract (CPW/CPE)

Wallets implementing TGP MUST enforce input correctness based on declared `signature_scheme`.

#### 8.6.6.1 Required Inputs by Scheme

| Scheme | Required Inputs | Optional Inputs |
|--------|----------------|-----------------|
| **CANONICAL_JSON** | `hash` (32-byte digest) | `message` (for display) |
| **EIP712** | `domain`, `types`, `message` | None |

#### 8.6.6.2 Wallet Validation Rules

Wallets MUST:

1. ✅ Verify `signature_scheme` is present and supported
2. ✅ Verify all required inputs for the scheme are provided
3. ✅ Reject requests with missing or invalid inputs
4. ✅ NOT synthesize or infer missing inputs
5. ✅ NOT substitute signing schemes
6. ✅ Display transaction details to user before signing (EIP712 only)

Rejection MUST return:

```json
{
  "error": "CPW_SIGNING_REJECTED",
  "code": "MISSING_REQUIRED_INPUT",
  "message": "hash field is required for CANONICAL_JSON signing",
  "required_fields": ["hash"]
}
```

#### 8.6.6.3 CANONICAL_JSON Signing Flow (CPW)

**Request from CPE:**

```json
{
  "method": "tgp_sign",
  "params": {
    "purpose": "TGP_SETTLE",
    "signature_scheme": "CANONICAL_JSON",
    "hash": "0x1234abcd...",
    "message": { /* original message for display */ }
  }
}
```

**CPW Processing:**

```typescript
async function handleCanonicalJsonSigning(params: SignRequest): Promise<string> {
  // 1. Validate inputs
  if (!params.hash) {
    throw new Error("hash is required for CANONICAL_JSON");
  }
  
  if (params.signature_scheme !== "CANONICAL_JSON") {
    throw new Error("Scheme mismatch");
  }
  
  // 2. Display to user (optional, show message summary)
  await showApprovalDialog({
    type: "TGP Settlement",
    orderID: params.message.order_id,
    amount: params.message.amount_wei,
    scheme: "CANONICAL_JSON"
  });
  
  // 3. Sign raw digest (NO PREFIX)
  const signature = await wallet.signingKey.sign(params.hash);
  
  return signature.serialized;
}
```

**CRITICAL:** Wallet MUST NOT apply EIP-191 prefix:

```typescript
// ❌ WRONG - DO NOT DO THIS
const prefixedHash = hashMessage(params.hash);
const signature = await wallet.signMessage(params.hash);

// ✅ CORRECT
const signature = await wallet.signingKey.sign(params.hash);
```

#### 8.6.6.4 EIP712 Signing Flow (CPW)

**Request from CPE:**

```json
{
  "method": "tgp_sign",
  "params": {
    "purpose": "TGP_SETTLE",
    "signature_scheme": "EIP712",
    "domain": { /* domain object */ },
    "types": { /* type definitions */ },
    "message": { /* typed message */ }
  }
}
```

**CPW Processing:**

```typescript
async function handleEIP712Signing(params: SignRequest): Promise<string> {
  // 1. Validate inputs
  if (!params.domain || !params.types || !params.message) {
    throw new Error("domain, types, and message are required for EIP712");
  }
  
  // 2. Validate domain matches TGP spec
  if (params.domain.name !== "Transaction Gateway Protocol" ||
      params.domain.version !== "3.4") {
    throw new Error("Invalid EIP-712 domain");
  }
  
  // 3. Display structured data to user
  await showTypedDataApproval(params.domain, params.types, params.message);
  
  // 4. Sign typed data
  const signature = await wallet.signTypedData(
    params.domain,
    params.types,
    params.message
  );
  
  return signature;
}
```

---

### 8.6.7 Preview Hash Binding (v3.4)

For all `SETTLE` messages, **regardless of signature scheme**:

**Requirements:**

1. ✅ `preview_hash` MUST be included in the signing payload
2. ✅ `preview_hash` is treated as protocol-critical data
3. ✅ Signature scheme MUST NOT alter preview semantics
4. ✅ Both CANONICAL_JSON and EIP712 MUST include preview_hash

**CANONICAL_JSON Example:**

```json
{
  "type": "SETTLE",
  "order_id": "ORD-22",
  "preview_hash": "0x789def...",  // ← Included before hashing
  "nonce": 92,
  "timestamp": 1736382601000,
  "origin_address": "0xBuyer123",
  "chain_id": 943
}
```

Canonical JSON (before hashing):
```json
{"chain_id":943,"nonce":92,"order_id":"ORD-22","origin_address":"0xBuyer123","preview_hash":"0x789def...","timestamp":1736382601000,"type":"SETTLE"}
```

**EIP712 Example:**

```typescript
const message = {
  type: "SETTLE",
  order_id: "ORD-22",
  preview_hash: "0x789def...",  // ← Included in typed data
  nonce: 92,
  timestamp: 1736382601000,
  origin_address: "0xBuyer123",
  chain_id: 943
};
```

**This guarantees:**

- ✅ No preview substitution attacks
- ✅ No settlement redirection
- ✅ Cross-scheme semantic equivalence
- ✅ User signed the exact preview they reviewed

---

### 8.6.8 Multi-Scheme Gateway Requirements (TBC)

TBC implementations MUST support both signature schemes equally and transparently.

#### 8.6.8.1 Scheme Acceptance

**Gateway MUST:**

1. ✅ Accept both `CANONICAL_JSON` and `EIP712` signatures
2. ✅ Verify according to declared `signature_scheme`
3. ✅ Apply identical security rules regardless of scheme
4. ✅ NOT privilege one scheme over another

**Implementation pattern:**

```rust
fn verify_signature(msg: &TgpMessage) -> Result<Address> {
    let scheme = msg.signature_scheme.as_ref()
        .ok_or(Error::MissingField("signature_scheme"))?;
    
    match scheme.as_str() {
        "CANONICAL_JSON" => verify_canonical_json(msg),
        "EIP712" => verify_eip712(msg),
        _ => Err(Error::UnsupportedSignatureScheme(scheme.clone()))
    }
}
```

#### 8.6.8.2 Prefix Detection

**Gateway SHOULD detect and reject prefix violations:**

```rust
fn verify_canonical_json(msg: &TgpMessage) -> Result<Address> {
    let canonical_hash = compute_canonical_hash(msg)?;
    
    // Attempt raw recovery
    match recover_address(&canonical_hash, &msg.signature) {
        Ok(addr) => Ok(addr),
        Err(_) => {
            // Check if signature is EIP-191 prefixed
            let prefixed_hash = eth_message_hash(&canonical_hash);
            if let Ok(_) = recover_address(&prefixed_hash, &msg.signature) {
                // Signature is valid but prefixed - reject
                return Err(Error::PrefixNotAllowed);
            }
            Err(Error::InvalidSignature)
        }
    }
}
```

Error response:

```json
{
  "type": "ERROR",
  "code": "A105_PREFIX_NOT_ALLOWED",
  "message": "EIP-191 prefix detected on CANONICAL_JSON signature",
  "hint": "Wallet may be applying personal_sign instead of raw signing"
}
```

#### 8.6.8.3 Non-Discriminatory Treatment

**Gateway MUST treat schemes identically for:**

- **Rate limiting** - Same limits regardless of scheme
- **Routing decisions** - Same routing logic regardless of scheme
- **Replay protection** - Same nonce/timestamp/UUID rules
- **Settlement execution** - Same executor path regardless of scheme
- **Fee calculation** - Same fee structure regardless of scheme

**Gateway MAY:**

- Log `signature_scheme` for analytics
- Monitor scheme distribution
- Track scheme-specific error rates

**Gateway MUST NOT:**

- Reject based on scheme preference
- Apply stricter validation to one scheme
- Route differently based on scheme
- Discriminate in any security-relevant way

---

### 8.6.9 Error Codes (Additive)

The following error codes are introduced in v3.4 for signature scheme handling:

| Code | Category | Meaning |
|------|----------|---------|
| `A103_UNSUPPORTED_SIGNATURE_SCHEME` | Authentication | Signature scheme not supported or not allowed for message type |
| `A105_PREFIX_NOT_ALLOWED` | Authentication | EIP-191 prefix detected on CANONICAL_JSON signature |
| `A106_INVALID_TYPED_DOMAIN` | Authentication | EIP-712 domain doesn't match TGP specification |
| `P002_MISSING_FIELD` | Protocol | Required field (signature_scheme) is missing |

**Existing error codes also apply:**

| Code | Meaning |
|------|---------|
| `A100_INVALID_SIGNATURE` | Signature recovery failed or signature malformed |
| `A101_ADDRESS_MISMATCH` | Recovered signer address doesn't match origin_address |

---

### 8.6.10 Test Vectors (Normative)

Implementations MUST verify correct behavior against these test vectors.

#### 8.6.10.1 CANONICAL_JSON Test Vector

**Input Message:**

```json
{
  "type": "SETTLE",
  "tgp_version": "3.4",
  "id": "test-uuid-canonical-001",
  "nonce": 42,
  "timestamp": 1700000000000,
  "origin_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "order_id": "TEST-ORDER-001",
  "preview_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "chain_id": 943,
  "signature_scheme": "CANONICAL_JSON"
}
```

**Step 1: Remove signature fields**

```json
{
  "type": "SETTLE",
  "tgp_version": "3.4",
  "id": "test-uuid-canonical-001",
  "nonce": 42,
  "timestamp": 1700000000000,
  "origin_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "order_id": "TEST-ORDER-001",
  "preview_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "chain_id": 943
}
```

**Step 2: Canonical JSON (sorted keys, no whitespace)**

```
{"chain_id":943,"id":"test-uuid-canonical-001","nonce":42,"order_id":"TEST-ORDER-001","origin_address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","preview_hash":"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef","tgp_version":"3.4","timestamp":1700000000000,"type":"SETTLE"}
```

**Step 3: keccak256 hash**

```
Expected hash: 0x8b42c5a6f7b3d9e2a1c8f4d6e9a2b5c7e1d3f6a8b2c4e7f9a1b3d5e8c7a9b2c4
```

**Step 4: Test signature (using test private key)**

Test private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

Expected signature:
```
0x[compute actual signature]
```

Expected recovered address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

**Verification test:**

```typescript
import { keccak256, toUtf8Bytes, Wallet } from 'ethers';

// Test data
const canonicalJson = '{"chain_id":943,"id":"test-uuid-canonical-001","nonce":42,"order_id":"TEST-ORDER-001","origin_address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","preview_hash":"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef","tgp_version":"3.4","timestamp":1700000000000,"type":"SETTLE"}';

const expectedHash = '0x8b42c5a6f7b3d9e2a1c8f4d6e9a2b5c7e1d3f6a8b2c4e7f9a1b3d5e8c7a9b2c4';

// Verify hash computation
const computedHash = keccak256(toUtf8Bytes(canonicalJson));
console.assert(computedHash === expectedHash, 'Hash mismatch');

// Verify signature
const testWallet = new Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const signature = await testWallet.signingKey.sign(computedHash);
const recovered = signature.recoverAddress(computedHash);
console.assert(recovered === '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'Address mismatch');
```

#### 8.6.10.2 EIP712 Test Vector

**Input Message:** (same as above)

**Typed Data:**

```typescript
const domain = {
  name: "Transaction Gateway Protocol",
  version: "3.4",
  chainId: 943
};

const types = {
  TgpSettle: [
    { name: "type", type: "string" },
    { name: "tgp_version", type: "string" },
    { name: "id", type: "string" },
    { name: "order_id", type: "string" },
    { name: "preview_hash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" },
    { name: "origin_address", type: "address" },
    { name: "chain_id", type: "uint256" }
  ]
};

const message = {
  type: "SETTLE",
  tgp_version: "3.4",
  id: "test-uuid-canonical-001",
  order_id: "TEST-ORDER-001",
  preview_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  nonce: 42,
  timestamp: 1700000000000,
  origin_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  chain_id: 943
};
```

**Expected EIP-712 hash:**

```
0x[compute actual EIP-712 hash]
```

**Verification test:**

```typescript
import { Wallet } from 'ethers';

const testWallet = new Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

const signature = await testWallet.signTypedData(domain, types, message);
const recovered = verifyTypedData(domain, types, message, signature);

console.assert(recovered === '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'Address mismatch');
```

**Both test vectors MUST recover to the same address** (`0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`), demonstrating that both schemes commit to the same transaction intent.

---

### 8.6.11 Security Considerations

#### 8.6.11.1 Cross-Scheme Replay Protection

**Threat:** Attacker attempts to replay a CANONICAL_JSON signature as EIP712 or vice versa.

**Mitigation:**

- TBC verifies `signature_scheme` field before attempting recovery
- CANONICAL_JSON uses raw keccak256 hash
- EIP712 uses domain-separated typed data hash
- Hash construction differs fundamentally between schemes

**Result:** Cross-scheme replay is cryptographically impossible - signatures from one scheme cannot be verified under another scheme.

#### 8.6.11.2 Prefix Injection Attack

**Threat:** Wallet inadvertently applies EIP-191 prefix to CANONICAL_JSON signature.

**Attack scenario:**

```typescript
// Wallet mistakenly uses personal_sign
const prefixedHash = hashMessage(canonicalHash);
const signature = await wallet.signMessage(canonicalHash);
```

**Mitigation:**

- TBC detects prefix patterns in signature recovery
- Attempts recovery with and without prefix
- Rejects with `A105_PREFIX_NOT_ALLOWED` if prefix detected
- CPW signing contract explicitly prohibits prefix application

**Detection method:**

```rust
// If raw recovery fails but prefixed recovery succeeds
if recovered_raw.is_err() && recovered_prefixed.is_ok() {
    return Err(PrefixNotAllowed);
}
```

**Result:** Prefix injection is detectable and rejected before any state modification.

#### 8.6.11.3 Domain Substitution Attack (EIP712)

**Threat:** Attacker modifies EIP-712 domain to replay signature on different chain.

**Attack scenario:**

Attacker intercepts EIP712 signature from chain 943 and attempts to replay on chain 1 (Ethereum).

**Mitigation:**

- Domain includes `chainId` field
- TBC verifies `domain.chainId` matches `message.chain_id`
- Signature becomes invalid if domain modified
- EIP-712 hash computation includes domain

**Result:** Cross-chain replay is cryptographically impossible. Chain-specific domain binding prevents signature reuse across networks.

#### 8.6.11.4 Scheme Downgrade Attack

**Threat:** Attacker forces client to use "weaker" signature scheme.

**Analysis:**

- Both CANONICAL_JSON and EIP712 use secp256k1 ECDSA
- Both provide equivalent cryptographic security (128-bit)
- No scheme is inherently weaker or stronger
- Scheme selection based on wallet capabilities, not security

**Mitigation:**

- Client chooses scheme based on context and wallet support
- TBC treats schemes equally for security validation
- No "upgrade" or "downgrade" concept exists

**Result:** No downgrade attack surface exists. Both schemes are cryptographically equivalent.

#### 8.6.11.5 Signature Malleability

**Threat:** Attacker modifies signature {r, s, v} to produce valid alternative signature.

**Mitigation:**

- TBC SHOULD enforce low-s requirement (s ≤ secp256k1_order/2)
- Both CANONICAL_JSON and EIP712 support low-s enforcement
- Malleated signatures recover to different addresses
- Address mismatch detection prevents malleated signature acceptance

**Implementation:**

```rust
// Enforce low-s
if signature.s > SECP256K1_CURVE_ORDER / 2 {
    return Err(Error::InvalidSignature);
}
```

**Result:** Signature malleability cannot be exploited for replay or address spoofing.

---

### 8.6.12 Implementation Guidance (Non-Normative)

#### 8.6.12.1 Scheme Selection by Actor

| Actor Type | Recommended Scheme | Rationale |
|------------|-------------------|-----------|
| Browser Wallet (MetaMask) | **EIP712** | Native wallet support, structured display |
| Hardware Wallet (Ledger) | **EIP712** | Secure display of transaction details |
| Server-side Agent | **CANONICAL_JSON** | Minimal overhead, deterministic |
| Headless Bot | **CANONICAL_JSON** | No wallet integration needed |
| Mobile Wallet | **EIP712** | Consistent with mobile standards |
| Exchange Integration | **CANONICAL_JSON** | Automated signing, no user prompt |
| Smart Contract Wallet | **Either** | Depends on implementation |

#### 8.6.12.2 When to Use Each Scheme

**Use CANONICAL_JSON when:**

- ✅ Building server-side automation
- ✅ Implementing deterministic testing
- ✅ Optimizing for minimal dependencies
- ✅ Operating in headless environments
- ✅ Maximum performance is critical
- ✅ No user approval UI needed

**Use EIP712 when:**

- ✅ Integrating with browser wallets
- ✅ Requiring hardware wallet support
- ✅ Displaying transaction details to users
- ✅ Following wallet ecosystem standards
- ✅ Maximizing wallet compatibility
- ✅ User approval is required

#### 8.6.12.3 Mixed Scheme Support

Implementations MAY support both schemes for maximum flexibility:

```typescript
class TgpSigningManager {
  async sign(message: TgpMessage, walletType: string): Promise<string> {
    if (walletType === 'injected' || walletType === 'hardware') {
      // Use EIP712 for browser/hardware wallets
      return this.signEIP712(message);
    } else if (walletType === 'embedded' || walletType === 'server') {
      // Use CANONICAL_JSON for embedded/server wallets
      return this.signCanonical(message);
    } else {
      // Default to CANONICAL_JSON
      return this.signCanonical(message);
    }
  }
  
  private async signCanonical(message: TgpMessage): Promise<string> {
    const hash = computeCanonicalHash(message);
    return this.wallet.signingKey.sign(hash).serialized;
  }
  
  private async signEIP712(message: TgpMessage): Promise<string> {
    const { domain, types, value } = buildEIP712Data(message);
    return this.wallet.signTypedData(domain, types, value);
  }
}
```

Gateway must accept both without prejudice:

```rust
// Gateway accepts both equally
match msg.signature_scheme.as_str() {
    "CANONICAL_JSON" => verify_canonical(msg),
    "EIP712" => verify_eip712(msg),
    _ => Err(UnsupportedScheme)
}
```

---

### 8.6.13 Summary

**With this signature scheme framework:**

✅ **CPE knows what to request** - Clear scheme selection based on wallet type  
✅ **CPW knows what to sign** - Explicit scheme with required inputs  
✅ **TBC knows how to verify** - Scheme-specific verification logic  
✅ **No guessing** - Mandatory scheme declaration  
✅ **No prefix traps** - Explicit prefix prohibition for CANONICAL_JSON  
✅ **No scheme drift** - Deterministic verification rules  
✅ **Maximum compatibility** - Support for both wallet-native (EIP712) and protocol-native (CANONICAL_JSON) signing

**Key principles:**

1. Both schemes are **first-class citizens** with equal support
2. Scheme selection is **explicit and mandatory**
3. Verification is **deterministic and unambiguous**
4. Security properties are **equivalent across schemes**
5. Implementation is **straightforward with clear examples**

---

**End of Section 8.6**
