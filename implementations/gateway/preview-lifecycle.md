# Preview Lifecycle

Complete flow for preview generation, storage, and consumption.

## Lifecycle States

```
GENERATED → AVAILABLE → EXECUTING → CONSUMED
                  ↓
              EXPIRED
```

## Generation (on QUERY)
1. Resolve settlement contract
2. Determine gas mode
3. Estimate gas costs
4. Generate preview nonce
5. Compute preview hash
6. Store with `consumed=false`

## Verification (on SETTLE)
1. Load preview by `order_id`
2. Verify `preview_hash` matches
3. Check not expired
4. Check not consumed
5. Mark `executing=true` (atomic)
6. Execute settlement
7. Mark `consumed=true`

## Key Properties
- **Immutable**: Cannot be modified after generation
- **Single-use**: Can only be consumed once
- **Time-bound**: Expires after `execution_deadline_ms`
- **Atomic**: `executing` flag prevents concurrent settlement

## See Main README

For complete implementation, see [Gateway README](./README.md).

