# Gateway Validation Pipeline

Complete message validation flow for TGP gateways.

## Overview

Every incoming message passes through a multi-stage validation pipeline before routing.

## Validation Stages

### 1. JSON Parsing
- Validate well-formed JSON
- Check message size limits
- Error: `P001_INVALID_JSON`

### 2. Schema Validation
- Required fields present
- Field types correct
- Error: `P002_MISSING_FIELD`

### 3. Signature Verification (Economic Messages)
- Recover signer from signature
- Match `origin_address`
- Error: `A100_INVALID_SIGNATURE` or `A101_ADDRESS_MISMATCH`

### 4. Replay Protection
- **Nonce**: Must be greater than last seen
- **Timestamp**: Within 5-minute window
- **UUID**: Not previously seen
- Errors: `R200_NONCE_TOO_LOW`, `R202_TIMESTAMP_TOO_OLD`, `R204_MESSAGE_ID_DUPLICATE`

### 5. Route to Handler
- Transport messages → Transport handler
- Economic messages → Economic handler
- Agent messages → Agent handler

## See Main README

For complete implementation, see [Gateway README](./README.md).

