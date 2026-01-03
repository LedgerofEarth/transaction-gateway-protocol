# Gateway Routing Flow

Message routing logic for TGP gateways.

## Routing Table

| Type | Handler | Signature Required |
|------|---------|-------------------|
| PING | Transport | No |
| PONG | Reject (outbound only) | No |
| QUERY | Economic | Yes |
| ACK | Reject (outbound only) | No |
| SETTLE | Economic | Yes |
| WITHDRAW | Economic | Yes |
| PREVIEW | Transport | No |
| VALIDATE | Transport | No |
| ERROR | Reject (outbound only) | No |

## Economic Path

```
Message → Validate Signature → Check Replay → Route
```

- QUERY → Generate Preview → Update Commitments → Return ACK
- SETTLE → Verify Preview → Execute Settlement → Return ACK
- WITHDRAW → Verify Eligibility → Execute Withdrawal → Return ACK

## Transport Path

```
Message → Route (no signature)
```

- PING → Return PONG
- PREVIEW → Generate Preview → Return PREVIEW_RESULT
- VALIDATE → Check Signature → Return VALIDATE_RESULT

## See Main README

For complete implementation, see [Gateway README](./README.md).

