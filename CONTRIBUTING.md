# Contributing to TGP

Thank you for your interest in contributing to the Transaction Gateway Protocol (TGP)! This document outlines how to propose changes, submit improvements, and participate in protocol development.

---

## Table of Contents

1. [How to Contribute](#how-to-contribute)
2. [Contribution Types](#contribution-types)
3. [Proposal Process](#proposal-process)
4. [Pull Request Format](#pull-request-format)
5. [Discussion Guidelines](#discussion-guidelines)
6. [Version Bump Requirements](#version-bump-requirements)
7. [What Will Be Rejected](#what-will-be-rejected)
8. [Code of Conduct](#code-of-conduct)

---

## How to Contribute

### Getting Started

1. **Read the Specification** — Familiarize yourself with [TGP-00 v3.4](./specs/TGP-00-v3.4-README.md)
2. **Check Existing Issues** — See if your idea has been discussed
3. **Join the Conversation** — Participate in GitHub Discussions or Telegram
4. **Start Small** — Typo fixes and clarifications are great first contributions

### Ways to Contribute

- **Specification Improvements** — Clarify ambiguous language, fix errors
- **New Extensions** — Propose optional protocol extensions
- **Implementation Feedback** — Report interoperability issues
- **Documentation** — Improve examples, add diagrams
- **Security Reviews** — Identify vulnerabilities or attack vectors
- **Test Vectors** — Add canonical test cases

---

## Contribution Types

### 1. Editorial Changes

**Examples:**
- Typo fixes
- Grammar improvements
- Formatting corrections
- Clarifying existing language without changing meaning

**Process:** Submit PR directly (no prior discussion needed)

---

### 2. Clarifications

**Examples:**
- Resolving ambiguous statements
- Adding examples to illustrate existing rules
- Expanding definitions

**Process:**
1. Open GitHub Issue describing the ambiguity
2. Propose clarification
3. Wait for community feedback (≥3 days)
4. Submit PR with changes

---

### 3. Protocol Improvements

**Examples:**
- Adding new error codes
- Improving replay protection
- Enhancing security properties

**Process:**
1. Open GitHub Discussion with proposal
2. Discuss design alternatives
3. Gain rough consensus (≥2 weeks)
4. Submit detailed PR

---

### 4. New Extensions

**Examples:**
- New optional message fields
- New settlement types
- New cryptographic schemes

**Process:**
1. Review [TGP-EXT-00](./specs/TGP-EXT-00.md) extension rules
2. Open GitHub Discussion with:
   - Motivation
   - Design overview
   - Security analysis
   - Backward compatibility analysis
3. Iterate on design (≥4 weeks)
4. Implement proof-of-concept
5. Submit PR with complete specification

---

### 5. Breaking Changes

**Examples:**
- Changing existing field meanings
- Removing deprecated features
- Incompatible protocol changes

**Process:**
1. Open GitHub Discussion with strong justification
2. Propose migration path
3. Build consensus (≥8 weeks)
4. Increment major version
5. Submit PR with changes + migration guide

**Note:** Breaking changes require extraordinary justification and are rarely accepted.

---

## Proposal Process

### Step 1: Research

- Read existing specifications thoroughly
- Check for similar past proposals
- Understand why current design exists
- Identify specific problems your proposal solves

### Step 2: Discussion

**For small changes:**
- Open GitHub Issue
- Describe problem and proposed solution
- Link to relevant spec sections

**For large changes:**
- Open GitHub Discussion
- Write detailed proposal with:
  - Problem statement
  - Proposed solution
  - Alternatives considered
  - Security implications
  - Backward compatibility impact
  - Implementation complexity

### Step 3: Consensus

- Engage with feedback constructively
- Revise proposal based on discussion
- Address concerns raised
- Demonstrate rough consensus (not unanimous agreement)

### Step 4: Implementation

- Write proof-of-concept if applicable
- Create test vectors
- Update affected documentation
- Ensure backward compatibility

### Step 5: Pull Request

- Submit PR following format guidelines (see below)
- Link to Discussion/Issue
- Address reviewer feedback
- Maintain patience during review process

---

## Pull Request Format

### Title Format

```
[TYPE] Brief description

Examples:
[EDITORIAL] Fix typo in Section 8.2
[CLARIFICATION] Add example for preview hash computation
[IMPROVEMENT] Enhance nonce validation error messages
[EXTENSION] Add TGP-00-v3.4-MULTISIG specification
[BREAKING] Change signature algorithm to Ed25519
```

### PR Description Template

```markdown
## Summary
Brief description of changes

## Motivation
Why is this change needed?

## Changes
- Specific change 1
- Specific change 2

## Backward Compatibility
- [ ] No impact on existing implementations
- [ ] Requires version bump (specify major/minor)
- [ ] Breaking change (requires migration guide)

## Related Issues
Closes #123
Relates to #456

## Checklist
- [ ] Read CONTRIBUTING.md
- [ ] Follows extension rules (if applicable)
- [ ] Updated CHANGELOG.md
- [ ] Added test vectors (if applicable)
- [ ] No implementation-specific details
- [ ] No vendor-specific references
```

---

## Discussion Guidelines

### Be Respectful

- Assume good faith
- Focus on ideas, not people
- Use inclusive language
- Welcome newcomers

### Be Specific

- Reference specific spec sections
- Provide concrete examples
- Cite implementation experience when relevant
- Link to related discussions

### Be Constructive

- Explain why you disagree
- Suggest alternatives
- Help improve proposals
- Acknowledge good points

### Stay On Topic

- Keep discussions focused on protocol design
- Avoid implementation debates (language, framework, etc.)
- Avoid vendor promotion
- Avoid bikeshedding (arguing over trivial details)

---

## Version Bump Requirements

### When to Bump Versions

| Change Type | Version Bump | Example |
|------------|--------------|---------|
| Editorial fix | None | Fix typo in comment |
| Clarification | None | Add example to existing section |
| New error code | Minor | Add `W401_NEW_ERROR` |
| New optional field | Minor | Add `optional_hint` field |
| New extension | Minor | Add TGP-00-v3.4-NEWEXT |
| Changed field meaning | Major | Change `nonce` semantics |
| Removed field | Major | Remove deprecated `legacy_field` |

### Version Numbering

```
TGP-00 v<MAJOR>.<MINOR>

Examples:
TGP-00 v3.4 → v3.5 (minor bump, new optional features)
TGP-00 v3.4 → v4.0 (major bump, breaking changes)
```

### CHANGELOG.md Updates

All version bumps MUST be documented in CHANGELOG.md with:

- Date of change
- Version number
- List of changes
- Migration notes (if applicable)

---

## What Will Be Rejected

The following types of contributions will be rejected immediately:

### ❌ Implementation-Specific Details

- Language-specific code examples (unless illustrative)
- Framework-specific advice
- Vendor product recommendations
- Deployment automation scripts

**Why:** TGP is implementation-agnostic. Specifications must be implementable in any language.

---

### ❌ Wallet Logic

- Key management strategies
- UI/UX requirements
- Browser extension architecture
- Mobile wallet design

**Why:** TGP defines the protocol, not wallet implementations.

---

### ❌ Custody Solutions

- Multi-sig wallet designs
- Hardware wallet integration
- Custodial service patterns
- Key recovery mechanisms

**Why:** TGP is explicitly non-custodial. Custody is out of scope.

---

### ❌ Chain-Specific Hacks

- "Add field for Ethereum-only feature X"
- "Special case for Solana address format"
- "Optimize for Base L2 gas pricing"

**Why:** TGP is chain-agnostic. Chain-specific features belong in implementation layers.

---

### ❌ Marketing Language

- "Revolutionary new approach to..."
- "Best-in-class solution for..."
- "Disrupting the industry with..."

**Why:** Specifications must be neutral, technical, and precise.

---

### ❌ Vague Claims

- "Secure payment protocol"
- "Trustless settlement"
- "Private transactions"

**Why:** Specify exact guarantees, not marketing terms.

**Better:** "Non-custodial operation: gateways cannot unilaterally move funds"

---

### ❌ Premature Optimization

- "Add this field for future feature X"
- "Reserve this range for possible extension Y"
- "Include this just in case..."

**Why:** Add features when needed, not speculatively.

---

### ❌ Incomplete Proposals

- No security analysis
- No backward compatibility analysis
- No test vectors
- No migration path

**Why:** Protocol changes require thorough analysis.

---

## Code of Conduct

### Our Standards

We are committed to providing a welcoming and inclusive environment.

**Expected Behavior:**
- Be respectful and professional
- Welcome diverse perspectives
- Focus on protocol improvement
- Help newcomers learn
- Give credit where due

**Unacceptable Behavior:**
- Harassment or discrimination
- Personal attacks
- Trolling or inflammatory comments
- Spam or self-promotion
- Sharing private information

### Enforcement

Violations of this code of conduct will result in:

1. **Warning** — First offense
2. **Temporary ban** — Repeated offense
3. **Permanent ban** — Severe or continued violations

Report violations to [project maintainers].

---

## Getting Help

### Resources

- **Specification:** [TGP-00 v3.4](./specs/TGP-00-v3.4-README.md)
- **Glossary:** [TGP-GLOSSARY.md](./specs/TGP-GLOSSARY.md)
- **Extensions:** [TGP-EXT-00.md](./specs/TGP-EXT-00.md)

### Support Channels

- **GitHub Issues** — Bug reports, spec clarifications
- **GitHub Discussions** — Design discussions, proposals
- **Telegram** — [TGP Contributors Group] (link TBD)

### FAQ

**Q: Can I implement TGP in my project?**  
A: Yes! TGP is an open protocol. Follow the specification and you're compliant.

**Q: Do I need permission to create an implementation?**  
A: No. The protocol is open. Implementations are encouraged.

**Q: Can I propose a closed-source extension?**  
A: Extensions must be openly specified. Implementations can be any license.

**Q: Who approves changes to the spec?**  
A: Community consensus through the proposal process.

**Q: How long does the review process take?**  
A: Editorial changes: days. Minor improvements: weeks. Major changes: months.

---

## License

By contributing to TGP, you agree that your contributions will be licensed under the Apache License 2.0, the same license used for the specification.

---

**Thank you for helping make TGP better!**

