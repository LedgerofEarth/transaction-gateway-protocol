n TGP v3.4, payment_profile is defined as an opaque identifier string whose interpretation is gateway-specific.

For compatibility with existing TBC deployments, gateways MAY require payment_profile to be encoded as a 20-byte Ethereum address representing the merchant’s settlement contract.

Clients MUST NOT assume that payment_profile is a structured object or policy descriptor at the wire level in v3.4.

Higher-level payment policies (e.g. routing rules, relay preferences, ENS-based profiles) are considered out-of-band semantics and MUST be resolved by the gateway prior to settlement.

Future protocol versions may introduce structured payment profile objects once gateway support is standardized.