# Hook Marketplace: Financial Model

**Document type:** Detailed financial model for founder planning and investor review
**Date:** 2026-03-10
**Scope:** Phase 1 through Phase 3 (Month 0 through Month 48)

---

## Preface: What This Model Is and Is Not

This model is built from three research inputs: an analysis of OSS developer tool revenue models (ws-revenue.md), a comparative study of existing plugin marketplace structures (ws-marketplace-models.md), and strategic research on the hook marketplace opportunity (hook-marketplace-research.md, Section 6). Where numbers come from direct comparables (npm, JFrog Artifactory, JetBrains Marketplace, GitHub Actions), that is noted. Where numbers are estimates based on conversion rate analogues from adjacent markets, that is also noted.

The model is deliberately conservative. The optimistic case for Claude Code growth exists, but it depends on a platform trajectory that a solo founder cannot control. A financial model that only works in the optimistic case is not a plan — it is a hope. This model shows what the business looks like if things go approximately as expected, what breaks first if growth is slower, and what the upside looks like if it goes well.

One figure from the research deserves emphasis upfront: the research states plainly that "$100k MRR is a year 3-4 outcome that requires Claude Code to reach several million active users — anyone claiming $100k MRR in year 1 is not being honest about the current market size." This model holds to that standard.

---

## Section 1: Cost Structure

### Phase 1: Month 0–6 (GitHub-backed, solo founder)

This phase has essentially no infrastructure costs. The registry is a static JSON file served from GitHub. The CLI is distributed via npm or a curl installer. The website, if any, is GitHub Pages or a static hosting service with a free tier. The only real cash outlay is a domain and basic tooling.

| Cost Item | Monthly Cost | Notes |
|-----------|-------------|-------|
| Domain name | ~$10 | Approximately $120/year for a .dev domain |
| Basic tooling (GitHub Pro, email) | ~$20 | GitHub Pro for private repos, a business email address |
| Miscellaneous (design assets, fonts) | ~$20 | One-time or infrequent purchases amortized monthly |
| **Total cash burn** | **~$50/month** | **~$600/year** |

Founder time is the real cost in Phase 1. The model assumes full-time founder commitment — roughly 40+ hours per week across CLI development, hook authoring, community building, and the initial Show HN distribution push. This is sweat equity, not a cash cost, but it is a real cost with a real opportunity cost. If the founder has a day job, Phase 1 extends in calendar time proportionally.

**What Phase 1 buys:** proof that the install mechanic works, that developers will use the CLI, and that hook authors will submit hooks. The deliverable is 500+ CLI installs and at least 20 third-party hook submissions within 6 months. These are the preconditions for Phase 2.

### Phase 2: Month 6–18 (Hosted registry, small team)

Once the registry needs an API (for verified badge status checks, install telemetry, search beyond static JSON), the infrastructure cost changes materially. This phase also introduces the first paid headcount: a part-time contractor for security review, which is the core function of the verified badge program.

| Cost Item | Monthly Cost (Low) | Monthly Cost (High) | Notes |
|-----------|-------------------|--------------------|----|
| VPS/cloud hosting for registry API | $100 | $300 | A small DigitalOcean or Fly.io setup; scales with traffic |
| CDN for hook file delivery | $50 | $100 | Cloudflare or Fastly; likely low cost at early traffic volumes |
| Security review tooling (static analysis, sandboxed execution) | $50 | $150 | Semgrep, CodeQL, a sandboxed runner for hook execution testing |
| Part-time security reviewer (contractor) | $2,000 | $5,000 | Fractional senior security engineer; price reflects 10-25 hours/month |
| **Total cash burn** | **~$2,200/month** | **~$5,550/month** |  |
| **Annualized** | **~$26,000/year** | **~$67,000/year** |  |

*Assumption note: The security review contractor is the largest variable here. At low hook submission volume (under 50 new hooks/month), 10 hours/month at $150-200/hour is sufficient. If the verified badge program takes off and submission volume is high, this scales toward the high end. The Phase 2 model does not include any full-time salaries — the founder remains uncompensated or pays themselves minimally from early revenue.*

### Phase 3: Month 18–36 (Enterprise-ready)

Enterprise sales require real infrastructure reliability (uptime SLAs), a product that can handle SSO and audit logs, and humans who can run a sales motion. This phase assumes the hire of 1-2 full-time employees — a second engineer or a sales/growth hire — and meaningful infrastructure spend.

| Cost Item | Monthly Cost (Low) | Monthly Cost (High) | Notes |
|-----------|-------------------|--------------------|----|
| Infrastructure (registry API, CDN, database, backups) | $500 | $2,000 | Now serving enterprise tenants with uptime requirements |
| Team — 1-2 FTE (engineer + sales or second engineer) | $12,000 | $20,000 | $12-20k/month covers 1-2 US-based hires at market rate; offshore reduces this |
| Founder salary (now paying themselves) | $3,000 | $5,000 | Conservative founder comp during growth phase |
| Legal and compliance (SoC 2 audit prep, contract review) | $1,000 | $2,000 | SoC 2 Type I is needed for enterprise deals; $1-3k/month for prep |
| Sales and marketing (conferences, content, outbound tooling) | $500 | $1,000 | Dev conference presence, outbound email tooling |
| **Total cash burn** | **~$17,000/month** | **~$30,000/month** |  |
| **Annualized** | **~$204,000/year** | **~$360,000/year** |  |

*Assumption note: The team cost range is wide because it depends heavily on location and hiring strategy. A solo founder who hires a US-based senior engineer at $150k/year + a part-time sales contractor is at the high end. A founder who hires one offshore engineer and runs sales personally is at the low end. The model treats $17-30k/month as the realistic range for a small but functioning team capable of closing enterprise deals.*

### Phase Summary

| Phase | Period | Monthly Cash Burn | Annual Cash Burn | Primary Driver |
|-------|--------|------------------|-----------------|---------------|
| Phase 1 | Month 0-6 | ~$50 | ~$600 | Domain + tooling |
| Phase 2 | Month 6-18 | $2,200–$5,550 | $26k–$67k | Security contractor + infrastructure |
| Phase 3 | Month 18-36 | $17,000–$30,000 | $204k–$360k | Team salaries + legal/compliance |

---

## Section 2: Revenue Model

The marketplace runs three revenue streams. They are designed to activate in sequence — each one funds the development of the next.

### Revenue Stream 1: Hook Author Certification

**What it is:** Hook authors pay for a human security review and a verified badge on their hook's registry page. The badge signals to users and enterprise buyers that the hook has been reviewed for malicious behavior, unsafe capability declarations, and supply chain risks.

**Why authors pay:** The CVE research (CVE-2025-59536, CVE-2026-21852) documents that hook sharing from random GitHub repos is a meaningful security risk — hooks run as shell commands with Claude's permissions. Enterprise IT departments will not approve hooks from unverified authors. A verified badge is the difference between an author's hook being installable in corporate environments and being blocked at the policy level. The badge is not a vanity feature; it is a sales enabler for the hook author.

**Pricing:**

| Tier | Price | What it includes |
|------|-------|-----------------|
| Unverified (free) | $0 | Automated static analysis, listing in public registry |
| Verified Individual | $99/year | Human security review, signed manifest, verified badge, best-effort review turnaround |
| Verified Organization | $299/year | Same as Individual plus org namespace (`@acme/`), priority 5-business-day turnaround, up to 10 hooks per year |

*Pricing rationale: $99/year is below the threshold where an individual developer does significant price sensitivity analysis. It is the App Store developer fee model ($99/year) applied to hooks. The org tier at $299/year is priced to capture teams and companies where the hook author is being paid to build and maintain hooks — their company absorbs the cost.*

**Conversion rate assumption:** 5-10% of active hook authors will pursue verification within 12 months of launch. This is grounded in the JetBrains Marketplace analogue where roughly 8% of plugin authors have paid for enhanced listings or priority support. It also reflects that certification is most valuable to authors with meaningful install counts — low-install hooks have little incentive to pay. The model uses 8% as the central estimate, applied only to hooks with >100 installs.

**Revenue at scale:**

| Registry Size | Hooks with >100 Installs | Conversion (8%) | Avg. Price | Annual Certification Revenue |
|--------------|------------------------|-----------------|------------|------------------------------|
| 200 hooks | ~60 | ~5 paying | $130 avg | ~$650/year |
| 500 hooks | ~150 | ~12 paying | $140 avg | ~$1,700/year |
| 1,000 hooks | ~300 | ~25 paying | $150 avg | ~$3,750/year |
| 2,000 hooks | ~600 | ~50 paying | $160 avg | ~$8,000/year |
| 5,000 hooks | ~1,500 | ~120 paying | $180 avg | ~$21,600/year |

*Note: Average price increases modestly over time as the org tier grows as a share of certified authors — organizations are more willing to pay $299 as enterprise demand for verified hooks becomes established.*

### Revenue Stream 2: Enterprise Private Registry

**What it is:** A hosted private registry for organizations that cannot use public hooks in production. This includes: private hook namespaces, SSO/SAML authentication, audit logs (who installed which hook, from which machine, when), policy enforcement (allowlist/denylist public hooks), and for the largest customers, an air-gapped mirror.

**Why enterprises pay:** Four reasons, in order of urgency. First, SSO is a hard requirement for most enterprise IT security policies — no SSO means the tool is not on the approved vendor list. Second, audit logs are required for SOC 2 compliance and internal security reviews. Third, supply chain security requirements (post-SolarWinds) mean enterprises need to control which hooks their developers can install. Fourth, regulated industries (finance, healthcare, defense) cannot pull packages from the public internet in many environments.

**Pricing:**

| Tier | Price | Users | What it includes |
|------|-------|-------|-----------------|
| Team | $299/month | Up to 25 developers | Private namespace, audit logs, SSO, basic policy |
| Business | $799/month | Unlimited developers | Everything in Team, plus SAML, allowlist/denylist policy enforcement |
| Enterprise | $2,000/month+ | Unlimited + SLA | Everything in Business, plus air-gapped mirror support, dedicated SLA, Slack/Teams support channel, custom security review |

*Pricing rationale: npm Teams runs $7/developer/month, which at 25 users is $175/month — our Team tier is priced above this because hooks carry higher security implications than npm packages and the review services justify a premium. JFrog Artifactory enterprise starts at ~$1,500/month for a full artifact management platform; our Enterprise tier is priced below this because hooks are a narrower problem scope. GitHub Enterprise at $21/developer/month would be $525/month for 25 users — our $299/month is competitive for the function delivered. These comparables are documented in ws-revenue.md.*

**Target customer profile:** Companies already using Claude Code in CI/CD pipelines with 5+ developers. These companies are identifiable through install telemetry — high install counts from a corporate IP range or domain-consistent email addresses are the signal. The sales motion starts with the technical champion (the developer who found hookpm) and works upward to the engineering manager or security team.

**Conversion rate assumption:** The research estimates 1-2% of enterprise-adjacent Claude Code users will convert to a paid private registry. This is speculative — there is no directly comparable product to benchmark against. The npm Enterprise conversion rate (enterprise paying for private package management after using public npm) is roughly 0.5-1% of npm's overall user base. Given that hook installation has a security implication that npm packages often do not, and given that enterprise Claude Code use is a deliberate choice (not accidental adoption), 1-2% is defensible as a slightly higher conversion rate than npm Enterprise. The model uses 1% as the conservative case.

### Revenue Stream 3: Featured Listings

**What it is:** Hook authors pay for top placement in search results and category pages. A "Featured" badge appears on their hook's listing card. This is the Google AdWords model applied to hook discovery.

**Why this is a later-stage stream:** Featured listings only generate revenue when the registry has meaningful search traffic. Running ads in an empty store converts no one. The model activates this stream at Month 18, when the registry is large enough that discoverability is genuinely competitive and authors have economic incentive to stand out.

**Pricing:** $49–$199/month per hook. Lower-traffic categories attract lower bids. High-traffic categories (security hooks, formatting hooks) attract competitive bids.

**Revenue potential:** Conservative assumption of 20 featured slots at an average of $100/month = $2,000 MRR. At 50 featured slots at $150/month = $7,500 MRR. This is a meaningful revenue addition at scale but not a primary revenue driver in the model's planning horizon.

*Caution: Featured listings can damage trust if poorly implemented. The community must perceive that featured hooks are still high-quality, not just highest-bidder. A curated "Featured" category that requires verified status as a prerequisite for featuring protects trust while still generating revenue.*

---

## Section 3: Revenue Timeline

The table below shows projected revenue by period. All figures are estimates. Certification revenue is billed annually and shown as monthly-amortized MRR in the MRR column, with the ARR column representing total annual run rate including the lump-sum nature of certification payments.

| Period | Certification ARR | Enterprise MRR | Featured MRR | Total MRR (approx) | Total ARR (approx) |
|--------|------------------|---------------|-------------|--------------------|--------------------|
| Month 0-6 | $0 | $0 | $0 | $0 | $0 |
| Month 6-12 | $0–$500 (first few) | $0–$897 | $0 | $0–$1,000 | $0–$11k |
| Month 12 | ~$500 | $0 | $0 | ~$40 amortized + $0 recurring = ~$40 | ~$500 |
| Month 18 | ~$5k | ~$5,000 | $0 | ~$5,400 | ~$65k |
| Month 24 | ~$15k | ~$15,000 | ~$1,000 | ~$17,000 | ~$200k |
| Month 36 | ~$30k | ~$40,000 | ~$2,000 | ~$44,500 | ~$534k |
| Month 48 | ~$60k | ~$80,000 | ~$5,000 | ~$90,000 | ~$1.08M |

**How to read the Month 12 row:** Certification revenue is billed annually as a lump sum. By month 12, roughly 5 authors have paid $99/year = $495 total received. Monthly amortized across 12 months, that is ~$40/month. The MRR column reflects recurring monthly revenue streams; the ARR column includes the certification lump sums. This is an honest reflection of how the cash actually flows — a batch of annual payments at renewal time, not a smooth monthly stream.

**How to read the Month 18 row:** $5,000/month enterprise MRR assumes 2 Business tier customers ($799×2 = $1,598) + 5 Team tier customers ($299×5 = $1,495) + 1 Enterprise customer ($2,000) = $5,093. Rounding to ~$5k. Certification ARR of $5k assumes ~35 verified authors at an average of $140/year.

**How to read the Month 36 row:** $40,000/month enterprise MRR assumes approximately: 5 Enterprise ($2,000×5 = $10k) + 15 Business ($799×15 = $11.985k) + 50 Team ($299×50 = $14.95k) + featured ($2k) = ~$39k. Total MRR is approximately $44.5k, ARR approximately $534k.

---

## Section 4: Unit Economics

### Certified Hook Authors

| Metric | Value | Notes |
|--------|-------|-------|
| Customer Acquisition Cost (CAC) | $0–$20 | Organic discovery through community; content-driven acquisition |
| Acquisition channel | Organic / peer referral | Authors learn about the badge from seeing other hooks display it |
| Average contract value | $99–$299/year | $130–$160 average blended across tiers |
| Average retention | ~3 years | Authors maintain hooks long-term; renewal driven by badge value to their users |
| Lifetime Value (LTV) | $300–$900 | ($130 avg) × 3 years = $390 average LTV |
| LTV:CAC ratio | 20:1 to effectively infinite | When CAC is near zero, the ratio is extremely favorable |

*The LTV estimate is conservative. An author who publishes a popular hook and relies on the verified badge for enterprise distribution will renew indefinitely. The 3-year average accounts for authors who stop maintaining hooks and let their certification lapse.*

*CAC assumption: The primary acquisition cost is blog posts, Show HN submissions, and community participation — activities the founder does anyway for growth. The marginal cost of converting an already-engaged author from free to paid certification is close to zero. The $0-20 range accounts for occasional direct outreach to high-install authors.*

### Enterprise Customers

| Metric | Value (Conservative) | Value (Optimistic) | Notes |
|--------|---------------------|-------------------|-------|
| CAC | $500–$2,000 | $300–$1,000 | Outbound emails, demo infrastructure, conference presence |
| Sales cycle | 45–90 days | 30–60 days | Enterprise security reviews add time |
| Average contract value (ACV) | $3,588–$24,000 | $5,000–$30,000 | Team ($299×12) to Enterprise ($2,000×12) |
| Blended ACV at scale | ~$10,000/year | ~$15,000/year | Mix weighted toward Business tier |
| Average contract length | 24 months | 30 months | Enterprise inertia works in our favor post-onboarding |
| LTV | $7,000–$48,000 | $12,000–$75,000 | ACV × contract length |
| LTV:CAC ratio | 10:1 to 25:1 | 15:1 to 75:1 | Strong unit economics even at conservative end |

*CAC assumption: At Phase 2, sales is founder-led and primarily inbound (technical champions discover hookpm through usage). CAC is low because there is no dedicated sales salary. At Phase 3, a sales hire adds to CAC. The $500-2,000 range reflects the blended cost including the fractional value of a sales hire's time per deal closed.*

*LTV:CAC ratio of 10:1 to 25:1 is strong by SaaS standards. A 3:1 ratio is generally considered the minimum for a healthy SaaS business. These ratios suggest the business is economically sound even if growth is slower than projected.*

---

## Section 5: Break-Even Analysis

Break-even occurs when revenue covers the total cash burn for that phase.

### Phase 1 Break-Even

| Phase 1 Annual Burn | ~$600 |
|---------------------|-------|
| Revenue per certified author (average) | ~$130/year |
| Authors needed to break even | **~5 certified authors** |
| When this is achievable | Month 6-9, assuming the badge launches at month 6 |

Phase 1 break-even is trivially easy to achieve. Five certification sales cover the full year's infrastructure costs. This is not a meaningful financial milestone — it is a validation signal that willingness to pay exists.

### Phase 2 Break-Even

| Phase 2 Annual Burn (midpoint) | ~$46,000 |
|-------------------------------|---------|
| Revenue mix at break-even | ~3 Team enterprise ($299×3×12 = $10,764) + 1 Business ($799×12 = $9,588) + certification ($5k) = $25,352 — not quite |
| More realistic break-even mix | 1 Enterprise ($2,000×12) + 2 Business ($799×2×12) + 5 Team ($299×5×12) + certification ($5k) |
| That mix totals | $24k + $19.2k + $17.9k + $5k = ~$66k ARR |
| Conclusion | **~2-3 enterprise customers at Business/Enterprise tier reaches break-even at Phase 2 midpoint burn** |

Phase 2 break-even is achievable by month 12-15 under the base case projections, assuming the enterprise pipeline started at month 7-8 and closed 2-3 deals within 90 days each.

### Phase 3 Break-Even

| Phase 3 Annual Burn (midpoint) | ~$280,000 |
|-------------------------------|---------|
| Revenue needed to break even | ~$280k ARR = ~$23.3k MRR |
| Revenue mix at break-even | 3 Enterprise ($6k) + 6 Business ($4.8k) + 30 Team ($9k) + certification ($3.5k) = $23.3k MRR |
| Total accounts needed | ~40 paying accounts |
| Conclusion | **~10-15 enterprise customers at Business/Enterprise tier, plus a larger Team base, reaches Phase 3 break-even** |

Phase 3 break-even is the critical milestone that determines whether the business is self-sustaining or requires external funding. At the Month 36 projections (~$44.5k MRR), the business has exceeded Phase 3 break-even and is generating meaningful free cash flow.

### Break-Even Summary Table

| Phase | Monthly Burn (midpoint) | Break-Even MRR | Accounts Needed | Expected Timing |
|-------|------------------------|---------------|-----------------|-----------------|
| Phase 1 | $50 | $5 (trivial) | 5 cert. authors | Month 6-9 |
| Phase 2 | $3,875 | $3,875 | 2-3 enterprise + cert. | Month 12-18 |
| Phase 3 | $23,500 | $23,500 | 10-15 enterprise + base | Month 24-30 |

---

## Section 6: Sensitivity Analysis

Three scenarios represent the most likely ways the base case projections could be wrong.

### Scenario A: Claude Code Growth Is 2x Slower Than Expected

**What this means:** Instead of reaching several million active developers by Year 3-4, Claude Code growth stalls at ~500k-1M active users due to competition from Cursor, GitHub Copilot, Gemini Code Assist, or a new entrant that captures developer mindshare.

| Metric | Base Case | Slow Growth Case | Impact |
|--------|-----------|-----------------|--------|
| Total Claude Code users (Month 36) | ~3-5M | ~1-1.5M | Platform ceiling reduced by 70% |
| Hook installs (Month 36) | 50k+ CLI installs | 15k-20k CLI installs | Smaller addressable base |
| Registry size (Month 36) | ~1,000 hooks | ~400-600 hooks | Fewer submissions from smaller community |
| Certified authors (Month 36) | ~50 authors | ~20-25 authors | Less certification revenue |
| Certification ARR (Month 36) | ~$30k | ~$10k-$15k | $15k-$20k reduction |
| Enterprise customers (Month 36) | ~30 accounts | ~10-15 accounts | Fewer enterprise discovery paths |
| Enterprise MRR (Month 36) | ~$40k | ~$12k-$18k | $22k-$28k reduction |
| Total ARR (Month 36) | ~$534k | ~$150k-$200k | 60-70% reduction |
| Phase 3 break-even? | Yes, Month 24-30 | Borderline — may require cost reduction | Critical inflection point |

**Conclusion:** A 2x slower growth scenario does not kill the business but materially delays profitability and significantly reduces the Year 3-4 revenue ceiling. The Phase 3 team hire (the biggest cost driver) may need to be delayed or replaced with a contractor model. The bootstrap path survives; the growth trajectory is compressed.

### Scenario B: Anthropic Builds an Official Hook Registry

**What this means:** Anthropic launches an official hook marketplace, either as a standalone product or integrated into Claude.ai or code.claude.com. This is the existential scenario — the platform operator enters the market.

The research (Section 9, hook-marketplace-research.md) identifies four possible Anthropic postures. The relevant question for financial modeling is what survives if the worst-case posture (direct competition) materializes.

| What Survives | What Disappears | Revenue Impact |
|--------------|----------------|---------------|
| Enterprise private registry — Anthropic will not build SSO + audit logs + air-gap mirror for enterprise | Public registry listing revenue (already $0, but the traffic/discovery value) | Discovery traffic shifts to official registry; hook authors submit there first |
| Verified badge for authors already invested in the ecosystem | New author certification — they certify through Anthropic for free | Certification stream largely eliminated |
| Featured listings for the private/enterprise side | Featured listings on the public registry | Public featured listings become worthless |
| Enterprise SLAs and support that Anthropic won't provide at small scale | Community trust as "the" place for hooks | Trust advantage evaporates; enterprise still needs private infra |

| Metric | Base Case | Anthropic Enters | Impact |
|--------|-----------|-----------------|--------|
| Certification ARR (Month 36) | ~$30k | ~$5k-$8k | 70-85% reduction; only existing certified authors renewing |
| Enterprise MRR (Month 36) | ~$40k | ~$30k-$35k | 12-25% reduction; enterprise private registry value persists |
| Public featured MRR | ~$2k | ~$0 | 100% eliminated |
| Total ARR (Month 36) | ~$534k | ~$350k-$430k | 20-35% reduction |

**Conclusion:** Anthropic entering the public registry market eliminates the certification revenue stream and the featured listings stream but leaves the enterprise private registry largely intact. The enterprise value proposition (SSO, audit logs, air-gapped mirrors, policy enforcement) is a costly infrastructure product that Anthropic is unlikely to build for small teams. The strategic response: accelerate enterprise private registry development and make it the primary revenue focus. If Anthropic enters, the business survives as a focused enterprise infra product, not a developer-facing marketplace. This is a significant but not fatal scenario.

### Scenario C: Hook API Changes Break 30% of the Catalog

**What this means:** Anthropic releases a major version of the hooks API that renames events, changes JSON schemas, or removes capabilities that 30% of catalog hooks depend on. Hooks that break stop generating installs; authors who see breakage may not renew certification.

| Metric | Base Case | 30% Hook Breakage | Impact |
|--------|-----------|------------------|--------|
| Active hooks in registry (Month 24) | ~600 | ~420 functional | 180 hooks broken; some repaired within 30 days, some abandoned |
| Install velocity | Baseline | -20% for 60-90 days | Breakage news spreads on HN/Reddit; temporary trust damage |
| Certified author renewals | 90% renewal rate | 70% renewal rate | 20% churn on the broke-and-didn't-fix cohort |
| Certification ARR at Month 24 | ~$15k | ~$10k-$12k | $3k-$5k reduction |
| Enterprise customer churn | Assumed 5%/year | Assumed 15%/year for 1 cycle | 1-2 enterprise customers pause or downgrade during migration |
| Enterprise MRR impact (Month 24) | ~$15k | ~$12k-$13k | $2k-$3k reduction for 1 quarter |
| Total ARR reduction | — | ~$15-25k temporary | Recoverable within 2 quarters with migration tooling |

**Conclusion:** A 30% hook breakage event is painful but manageable. It is recoverable because: (a) most hook authors will update their hooks within 30-60 days for hooks they actively maintain, (b) the marketplace can provide migration tooling and documentation that rebuilds trust, (c) the enterprise private registry value (SSO, audit logs) is API-agnostic. The risk is not existential — it is a 1-2 quarter revenue setback. The strategic mitigation is to maintain a close relationship with Anthropic's developer relations team so that API changes are communicated in advance with a migration path.

### Sensitivity Summary

| Scenario | Total ARR at Month 36 (Base) | Total ARR at Month 36 (Scenario) | % Change |
|----------|------------------------------|----------------------------------|---------|
| Base case | ~$534k | — | — |
| Claude Code growth 2x slower | ~$534k | ~$150k-$200k | -63% to -72% |
| Anthropic builds official registry | ~$534k | ~$350k-$430k | -19% to -34% |
| 30% hook breakage (temporary) | ~$534k | ~$480k-$510k | -4% to -10% |

The most material risk is platform growth, not competitive or technical risk. A business model that depends on Claude Code reaching millions of users is a platform bet. The financial model should be stress-tested against a lower platform ceiling before committing to Phase 3 headcount.

---

## Section 7: Funding Considerations

### Can This Be Bootstrapped?

Yes, through Phase 2. The math is straightforward:

Phase 1 burn is $600/year. This is well within the range of self-funded or credit-card bootstrapping. Phase 2 burn peaks at $67k/year. The enterprise revenue at Month 12-18 is projected at $5k-$15k MRR ($60k-$180k ARR), which covers Phase 2 burn with margin at the mid-to-high end. A founder with 12 months of personal runway (not unusual for a pre-seed founder) can reach Phase 2 break-even without external capital.

Phase 3 requires $204k-$360k/year in operating costs. At the projected Month 18 revenue of ~$65k ARR, the business cannot self-fund a Phase 3 team without either aggressive revenue acceleration or external capital. The gap is roughly $140k-$295k in the first year of Phase 3.

### The Bootstrap-Friendly Design of This Model

The OSS-first structure is intentionally bootstrap-friendly in ways that are worth naming explicitly:

1. **No cost of goods sold.** There is no per-user infrastructure cost that scales linearly with revenue. The registry serves files; the marginal cost of serving the 10,000th install is negligible compared to the first 100.

2. **Annual billing for certification.** Annual billing improves cash flow predictability. Ten new certification customers at $99/year = $990 received upfront, not $8.25/month.

3. **Enterprise annual contracts.** Enterprise customers are typically willing to pay annually for a small discount. Annual contracts eliminate the monthly churn risk and improve cash flow for a capital-constrained founder.

4. **No content moderation cost.** Unlike social platforms or marketplace businesses with user-generated content concerns, hook moderation is technical (automated static analysis + occasional human review for verified hooks). This is a bounded cost, not an open-ended one.

### Should You Raise?

The decision to raise depends on which constraint is binding first:

| Constraint | Implication | Raise? |
|-----------|-------------|--------|
| Market window: another team builds hookpm first | Speed matters more than capital efficiency | Yes — raise to accelerate |
| Enterprise sales: deals are closing but you can't hire a salesperson | Revenue is constrained by headcount | Maybe — a small raise unlocks sales capacity |
| Platform bet: Claude Code grows fast but you can't keep up | Infrastructure and support can't scale solo | Yes — raise to scale infra and team |
| Comfortable burn, predictable revenue growth | No acute constraint | No — bootstrap through Phase 2 |

**Seed round considerations:** A seed of $500k-$1.5M is appropriate if the founder wants to compress the timeline between Phase 2 and Phase 3. At $500k raised, the business has approximately 18 months of Phase 3 runway at $28k/month burn, which is enough time to reach the ~$23k MRR break-even point. At $1.5M raised, the business has 4+ years of Phase 2 runway or 18+ months of Phase 3 runway — enough to be deliberate about hiring and avoid premature scaling.

**Investor narrative:** This is an infrastructure-layer bet on the Claude Code ecosystem. The comparable investment theses are: Verdaccio (private npm registry), Sonatype Nexus (Java artifact registry), and JFrog (universal artifact management). Each of those businesses monetized developer tool ecosystems at the infrastructure layer, not the application layer. The hook marketplace is the same pattern applied to AI agent governance hooks — a new and underserved infrastructure category. The total addressable market is bounded by Claude Code adoption, which is the platform bet. The financial characteristics are strong: high LTV:CAC ratios, annual billing, low marginal cost of service.

**What to avoid:** Raising more than $1.5M before achieving Phase 3 break-even. Over-capitalized early-stage developer tool companies tend to over-build features and under-invest in distribution. The winning path for this product is proving willingness to pay with a small team, then scaling the enterprise sales motion once unit economics are validated.

---

## Section 8: Key Assumptions and Their Confidence Levels

The model's output is only as good as its inputs. This table summarizes the central assumptions and how confident the model is in each.

| Assumption | Central Estimate | Confidence | What Would Change It |
|-----------|-----------------|-----------|---------------------|
| Claude Code active users by Month 36 | 3-5M | Low-Medium | Competition from Cursor, Copilot, new AI coding tools |
| Certified author conversion rate | 8% of authors with >100 installs | Medium | Badge value depends on enterprise demand signal |
| Enterprise conversion rate | 1% of enterprise-adjacent users | Low | No directly comparable product to benchmark |
| Average enterprise ACV | ~$10k/year blended | Medium | Pricing is tested but not validated in market |
| Hook author churn rate | 10%/year | Medium | Low maintenance cost hooks tend to persist |
| Enterprise customer churn rate | 5%/year | Medium | Based on developer tool SaaS comparables |
| Security review contractor cost | $150-200/hour | High | Contractor market rate is known; hours depend on volume |
| Phase 3 team cost | $12-25k/month | High | US engineering and sales market rates are well-known |
| Time to first enterprise customer | Month 10-15 | Low-Medium | Enterprise sales timelines are highly variable |

*Low confidence does not mean the estimate is wrong — it means the outcome has high variance. The enterprise conversion rate, in particular, could be 0.3% or it could be 3%, and the model's Month 36 revenue changes by a factor of 3 depending on which end of that range materializes.*

---

## Summary: The Financial Case in Plain Language

The hook marketplace is a capital-light infrastructure business with strong unit economics and a platform dependency.

The unit economics are genuinely good: LTV:CAC ratios of 10:1 to 25:1 on the enterprise side and effectively higher on the certification side. Annual billing, low marginal costs, and a product that enterprises need (SSO, audit logs, policy enforcement) without having an obvious substitute.

The platform dependency is real: the revenue ceiling is directly tied to how many active Claude Code users exist. A slowdown in Claude Code adoption is the single biggest downside risk, and it is entirely outside the founder's control.

The bootstrappable path exists: Phase 1 and Phase 2 can be funded from personal runway and early enterprise revenue. Phase 3 may warrant a small seed round to accelerate the enterprise sales motion, but it is not required.

The break-even trajectory is achievable: Phase 1 break-even at Month 6-9 (trivial), Phase 2 break-even at Month 12-18 (requires 2-3 enterprise customers), Phase 3 break-even at Month 24-30 (requires ~40 paying accounts across all tiers).

The $1M ARR milestone is realistically achievable by Month 40-48, assuming base case platform growth and successful enterprise sales execution. It is not a Year 1 target and should not be presented as one.
