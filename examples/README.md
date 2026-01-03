# TGP Message Examples

This directory contains example JSON messages and flow documentation demonstrating TGP protocol usage.

---

## Protocol Message Examples

### Transaction Messages
- **query.json** — Buyer transaction intent (QUERY with COMMIT verb)
- **settle.json** — Settlement execution request (SETTLE with preview_hash)
- **select.json** — Selection confirmation (if applicable)

### Other Examples
- **advert.json** — Merchant advertisement
- **proof.json** — Proof-of-delivery or attestation

---

## Flow Documentation

- **Gateway_SingleHop_Flow.md** — Single-hop transaction flow through gateway
- **Gateway_Execution_Overview.md** — Gateway execution and coordination
- **three-domain-flow.md** — Multi-domain transaction patterns

---

## Usage

These examples are illustrative and demonstrate protocol compliance. Actual implementations should:

1. ✅ Generate unique UUIDs for each message
2. ✅ Use current timestamps
3. ✅ Sign messages with real private keys
4. ✅ Include valid preview_hash values (v3.4+)
5. ✅ Follow all validation rules in the specification

---

## Important Notes

- Examples use **generic gateway terminology**, not implementation-specific names
- Messages show required fields; optional fields may be omitted
- Signatures shown are examples; real signatures must be computed correctly
- Preview hashes must match gateway-generated previews

---

## See Also

- **[TGP-00 v3.4 Specification](../specs/TGP-00-v3.4-README.md)** — Complete protocol specification
- **[Part 2: Message Examples](../specs/TGP-00-v3.4-Part2.md#6-complete-message-examples)** — Additional examples in spec
- **[Implementation Guides](../implementations/)** — Reference implementation documentation

---

**Note:** These are protocol examples, not production code. Always validate against the official specification.


