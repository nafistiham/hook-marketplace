# Business Model

**Document:** 03-business-model.md
**Audience:** Founder, potential co-founders, early investors
**Last updated:** 2026-03-10

---

## The Short Version

This is an open-core business. The public registry is permanently free — that is non-negotiable and strategic. Revenue comes from two sources: charging hook authors for security certification, and charging organizations for a private enterprise registry. A third revenue stream (featured listings) is possible in year two but is not load-bearing in the model.

The model is validated by direct analogues: npm Pro/Teams, JFrog Artifactory, JetBrains Marketplace, and Apple's app notarization program. We are not inventing a new monetization pattern. We are applying a proven one to a new and growing ecosystem.

---

## The Three-Layer Model

The architecture of the business maps directly to the architecture of the product.

### Layer 1: Free Public Registry

The public registry is the community engine. Everything in it is free — permanently.

What is free:
- Submitting a hook for listing
- Installing any hook from the registry via CLI
- Basic search and discovery
- The `hookpm` CLI tool itself
- Public registry hosting and CDN
- Basic install count analytics for hook authors

This layer is how developers adopt the product. It is how the catalog grows. It is how the network effects that make layers 2 and 3 valuable are built. It exists to be used — not monetized.

**Why permanently free is not just altruism:** The developer tooling ecosystem has a documented and nearly irreversible expectation of free access to install and publish. VS Code's extension marketplace charges nothing to publish or install extensions, and the ecosystem has 50,000+ extensions as a result. The moment Microsoft introduced a paid tier for extensions, the community forked to Open VSX. npm removed its paid private package requirement after backlash. The pattern is consistent: once an OSS ecosystem establishes free expectations, charging for the baseline triggers forks and community fragmentation that are nearly impossible to recover from.

The free tier is not a cost center. It is the acquisition strategy. Every install is a potential future enterprise customer. Every hook author is a potential certification customer. Build the habit first. Revenue follows adoption; it does not precede it.

### Layer 2: Paid Certification

Hook authors — not users — pay for security review and the verified badge.

This is the App Store notarization model applied to AI agent hooks. A verified hook has been reviewed by a human, has its capabilities declared and confirmed against its actual implementation, and is signed with the registry's cryptographic key. The badge is the product.

Why developers pay for this: enterprises will not deploy unreviewed code to production developer machines. A verified badge is what gets a hook from "interesting GitHub project" to "approved vendor list." For an indie developer whose hook saves engineers two hours a week, $99/year to get it into enterprise environments is not a hard sell.

### Layer 3: Enterprise Private Registry

Organizations pay for a private, self-hostable registry with access controls, audit logs, and compliance features.

Why organizations pay for this: regulated industries (finance, healthcare, defense) cannot pull hooks from the public internet and install them on developer machines without documentation, access control, and audit trails. This is not a preference — it is a compliance requirement. An enterprise with 500 developers using Claude Code has exactly one option if they want centralized hook governance: a private registry. We are that option.

---

## Pricing

### Certification Tiers (charged to hook authors, annually)

| Tier | Price | What's Included | Target Customer |
|---|---|---|---|
| Unverified | Free | Automated static analysis only, public listing | Anyone |
| Verified Individual | $99/year | Human security review, signed manifest, verified badge, best-effort turnaround | Indie developers, open source maintainers |
| Verified Organization | $299/year | Same as Individual + org namespace (e.g., `@acme/bash-guard`), priority 5-business-day review, up to 10 hooks per year | Teams publishing multiple hooks, ISVs |

### Enterprise Registry Tiers (charged to organizations, monthly)

| Tier | Price | What's Included | Target Customer |
|---|---|---|---|
| Team | $299/month | Up to 25 developers, private namespace, audit logs, SSO | Engineering teams in mid-market companies |
| Business | $799/month | Unlimited developers, private namespace, audit logs, SSO, SAML, allowlist/denylist policy enforcement | Larger orgs with security team involvement |
| Enterprise | $2,000/month+ (annual contract) | Everything in Business + air-gapped mirror support, dedicated SLA, custom security review, Slack/Teams support channel | Regulated industries, defense contractors |

### Pricing Rationale

These numbers are not guesses. They are anchored to directly comparable products:

- **npm Pro/Teams:** $7–$21/user/month for private package registries. At $299/month for Team (25 developers), that is $12/developer/month — in range with npm Teams at $7/user/month.
- **JFrog Artifactory:** Enterprise artifact repository management starts at approximately $1,500/month. A hook registry is a narrower surface area, so our $2,000/month enterprise tier is positioned as a specialized, higher-trust alternative rather than a general-purpose artifact store.
- **GitHub Enterprise:** $21/developer/month. Our Business tier at $799/month for unlimited developers is priced to be competitive for organizations where per-seat pricing would become expensive at scale.
- **Apple notarization / developer certification programs:** $99/year for individual developer program membership is the established anchor for security certification in developer ecosystems. The $99 Verified Individual tier is intentionally aligned with this expectation.

The enterprise tier pricing reflects willingness to pay for compliance infrastructure, not for functionality. A $2,000/month contract is small for a company spending $100,000/year on developer tooling compliance audits.

---

## What People Actually Pay For

Not every feature on the pricing table drives purchase decisions equally. In order of real-world willingness to pay:

**For enterprises:**
1. SSO — without it, the tool does not make it to the approved vendor list. This is a gate, not a feature.
2. Audit logs — compliance teams need a record of what code ran on which developer machines and when.
3. Air-gapped mirror — regulated industries cannot pull from the public internet. Period.
4. Verified/signed hooks — post-SolarWinds, supply chain provenance is a purchasing trigger for security teams.
5. Policy enforcement — CISOs want to define an allowlist of approved hooks and block everything else.

**For hook authors:**
1. The verified badge — it is the signal that enterprise buyers require to put a hook on their approved list.
2. Organization namespace — `@acme/bash-guard` looks like a real vendor product. The bare `bash-guard` listing looks like a side project.

Build SSO and audit logs before everything else in the enterprise tier. Air-gap support is expensive to build and serves a smaller initial market — negotiate it into Enterprise contracts rather than shipping it to all Business customers.

---

## The Flywheel

The business model only works if the flywheel runs. Here is the cycle:

```
Free public registry
       |
       v
Developers discover and install hooks
       |
       v
Hooks accumulate install counts and reviews
       |
       v
Hook authors with active installs pursue Verified badge
       |          (first revenue stream)
       v
Enterprises discover hooks their devs are already using
       |
       v
Enterprises need private registry + certification
       |          (main revenue stream)
       v
Enterprise revenue funds better CLI, more hooks, better search
       |
       v
Back to: Developers discover and install hooks
```

The critical transition is "enterprises discover hooks their devs are already using." This is not a cold enterprise sales motion. The entry point is a developer who already uses the hook at home and advocates for it internally. The enterprise need follows organic developer adoption — it does not precede it. This is why the free tier must work well before the enterprise tier is built.

---

## What This Model Is Not

Clarity on what we are explicitly not doing matters as much as what we are doing.

**Not charging per install.** Per-install pricing would poison the developer community immediately. Free install is the expectation in every comparable ecosystem. Installing a hook should feel like running `npm install`.

**Not taking a commission on paid hooks.** Paid hooks — hooks where the author charges end users — are not part of this model. The ecosystem is too early for that. Most hooks are open source and their authors do not want to monetize them directly. Introducing a paid-hook commerce layer would require significant trust that does not yet exist, and the infrastructure costs (payment processing, licensing enforcement, piracy risk) are not justified by the market size.

**Not competing with Anthropic's tooling.** The marketplace is explicitly filling a gap that Anthropic has left open. The hooks API is a protocol; the registry is infrastructure around that protocol. We are building the npm to their Node.js. We do not build Claude Code features, we do not fork the CLI, and we do not position ourselves as an alternative to anything Anthropic ships.

**Not pursuing advertising or data monetization.** Hook install data has sensitivity implications. Selling data about what developer tools enterprises deploy is a trust violation that would make the enterprise product unsellable.

---

## Revenue Projections

The deep financial model, with full assumptions and scenario analysis, lives in `deep/financial-model.md`. The headline trajectory is:

| Period | Target MRR | What Gets You There |
|---|---|---|
| Month 0–12 | $0 | Building community. CLI ships, first 50 hooks, third-party contributions begin. No revenue. Goal is 500+ CLI installs and 20+ third-party hook submissions. |
| Month 12–18 | First certification revenue | Verified badge program launches. Target: 10–15 early adopters at $99/year. First Team tier enterprise customer at $299/month. MRR exits this period in the low hundreds of dollars. |
| Month 24 | $10,000 MRR | Driven by: 1 Enterprise contract ($2,000), 4 Business ($3,200), ~10 Team ($3,000), certification revenue amortized (~$1,800/month). Requires roughly 15 paying accounts total. |
| Month 36–48 | $100,000 MRR | Driven by: 5 Enterprise ($10,000), 20 Business ($16,000), 60 Team ($18,000), significant certification revenue (~$8,000/month amortized), possible hosted-runner usage component. Requires Claude Code to reach several million active developers. |

The $10k MRR milestone is achievable with deliberate effort and does not require exceptional luck — it requires 15 organizations to pay for something they genuinely need. The $100k MRR milestone is a platform bet: it requires Claude Code to grow substantially as a category, not just as a product. If Claude Code user growth stalls because of competition from Cursor, Copilot, Gemini Code, or a new entrant, the $100k MRR ceiling is lower than modeled.

Anyone projecting $100k MRR in year one for this product is not being honest about the current market size.

---

## The Anthropic Risk

This is the existential risk and it deserves honest treatment.

The hook marketplace is built on top of an API and a runtime that Anthropic controls entirely. There is no migration path to another platform — hooks are Claude Code-specific by definition. This concentration creates four distinct risk scenarios:

**Scenario 1: Anthropic blesses without competing.** They mention the marketplace in documentation, link to it from the Claude Code site, and continue leaving ecosystem tooling to the community. This is the most likely outcome. Their historical posture — building the protocol and letting `claudeforge`, `awesome-claude-code`, and community hook repos emerge organically — suggests they are not looking to own the marketplace layer.

**Scenario 2: Anthropic ignores.** They neither promote nor inhibit. The marketplace grows or does not based on its own merits. Neutral. Uncomfortable for enterprise buyers who want a vendor signal, but manageable.

**Scenario 3: Anthropic builds a competing official marketplace.** A `claude.ai/hooks` with first-party curation and one-click installation would be the worst case. This is unlikely in the near term — Anthropic is focused on core product and has consistently delegated ecosystem tooling — but it is not impossible. If it happens after year two, we have reference customers, a catalog, and a private registry product that an official marketplace does not offer at launch.

**Scenario 4: Anthropic's hooks API changes in a breaking way.** A major revision to event names, the JSON schema, or the decision format would require updating every hook in the registry. This is not a business-ending event on its own — npm survived Node.js API changes — but it would require significant engineering effort and could cause community frustration if handled poorly. The mitigation is to maintain a compatibility layer in the `hookpm` CLI that normalizes schema differences and to monitor the Claude Code changelog proactively.

### Mitigation Strategy

The platform dependency is real and cannot be fully eliminated. What can be done:

1. **Protocol-agnostic architecture.** The registry schema, the CLI, and the certification process are designed around a generalized hook specification, not Claude Code-specific types. When other Claude-compatible tools (or other AI agent frameworks that adopt a similar hook model) emerge, the registry should be extensible to cover them with minimal rework. The moat is the catalog and the community, not Claude Code specificity.

2. **Community ownership as structural protection.** The public registry is open source. The hook manifest schema is an open spec. The CLI is open source. If the company went away tomorrow, the community could fork and continue. This is not weakness — it is the reason enterprises trust the platform long-term. It is also what makes a hostile Anthropic action against the marketplace politically costly for Anthropic.

3. **Early relationship with the Claude Code team.** Not to ask permission. To make ourselves a known entity. A marketplace that Anthropic has spoken to and given informal feedback on is far less likely to be surprised by an API change without warning than one they discovered for the first time at a conference. The relationship is an early-warning system, not a dependency.

4. **Enterprise contracts as a hedge.** Enterprise customers who have signed 12-month contracts and integrated the private registry into their developer workflows have switching costs. Even if Anthropic launches a competing product, enterprise migration does not happen overnight. Annual contracts give 12 months of lead time to respond.

The honest summary: if Anthropic decides to own this layer, the business outcome is significantly worse than the base case. That risk is real. It is also the same risk every infrastructure business built on a platform faces — Heroku on AWS, Cloudflare Apps on Cloudflare, Shopify apps on Shopify. The response is to build something good enough that displacing it is costly, and to structure the legal and technical foundations so the community would survive the company.
