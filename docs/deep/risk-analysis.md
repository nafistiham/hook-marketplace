# Risk Analysis: Claude Code Hook Marketplace

**Date:** 2026-03-10
**Audience:** Founder, internal planning only
**Purpose:** Honest pre-commitment risk assessment. Not for external distribution.

---

## Preface

This document assumes you have read the strategic research and are seriously evaluating whether to build this. The goal here is not to talk you out of it or into it — that decision is covered elsewhere. The goal is to surface every risk clearly enough that you can make an informed commitment and have a response ready when each risk materializes. Several of these risks are genuinely serious. Some are existential under specific conditions. None of them are hidden or speculative — they are predictable from the structure of the product and the precedents set by comparable ecosystems.

Read this as a stress test, not a discouragement.

---

## Part I: Risk Register

Each risk is rated on two axes — Probability and Impact — using Low / Medium / High at the time of writing (March 2026). Ratings assume the marketplace has launched but has not yet reached significant scale ($10k MRR). Where the rating changes materially at scale, that is noted.

---

### Platform Risks

#### P1: Anthropic changes the hooks API in a breaking way

**Probability: Medium | Impact: High**

The hook event schema (event names, JSON payload fields, exit code semantics, decision format) has been stable since the hooks system launched in mid-2025. There is no public changelog or API versioning commitment for hooks. Anthropic is under no contractual obligation to maintain backward compatibility, and Claude Code is still in rapid development.

A breaking API change — renaming `PreToolUse` to something else, restructuring the `tool_input` field, adding required fields to the decision JSON — would render a significant portion of the hook registry non-functional. Users would see broken behavior with no warning. The marketplace would be blamed regardless of the source.

**Mitigation:**
- Build a versioned compatibility layer into the CLI: `hookpm` reads the installed Claude Code version and maps hook event names to the correct schema for that version
- Maintain a registry field `min_claude_version` and `max_claude_version` per hook
- Actively monitor Anthropic's release notes, changelog, and GitHub activity for early signals
- Build the Tier-1 reference hooks in a way that isolates API surface: a single adapter layer in the hook runner means most hooks only change in one place when the API changes
- Establish a relationship with Anthropic's developer relations team — not for access, but to be on the notification list when breaking changes are planned

**Residual risk:** Medium. Even with versioning and a compatibility layer, a sudden breaking change creates an operational crisis. You will spend weeks on migration work that produces zero new value. At significant registry scale (500+ hooks), migration coordination with third-party authors becomes a public relations and logistics problem.

---

#### P2: Anthropic builds an official hook registry

**Probability: Medium | Impact: High**

This is the most discussed existential risk. Anthropic has built the `plugin-marketplaces` protocol, the `marketplace.json` schema, and an official plugin directory (`anthropics/claude-plugins-official`). They have deliberately left the marketplace space to third parties — but that decision is revisable.

The research indicates this is most likely to happen in months 18-36 if the hook ecosystem proves large enough to be worth Anthropic's attention. The signal to watch: if `hesreallyhim/awesome-claude-code` exceeds 50k stars and hook marketplace discussions trend on developer forums, Anthropic has sufficient evidence that the ecosystem is real and may decide to build first-party infrastructure.

Anthropic's historical behavior in adjacent spaces (they've left MCP servers to the community, left CLAUDE.md tooling to the community) suggests they are comfortable being an API provider rather than an ecosystem operator. But the VS Code team made the same calculation before eventually building their own extension marketplace. Once a marketplace is perceived as critical infrastructure for the product, first-party ownership becomes attractive.

**Mitigation:**
- Build the moat that Anthropic cannot easily replicate: security verification infrastructure, enterprise private registry with SSO and audit logs, and the historical install data network effect
- Reach out to Anthropic proactively. Being a known, professional, security-focused operator is far better than being an unknown entity they discover at scale
- Keep the public registry spec and CLI fully open source. If Anthropic builds an official registry, position as the enterprise security layer and compliance tool that sits on top of it — not as a competitor to it
- Price and position from day one around the things Anthropic is structurally unlikely to build: enterprise audit logs, air-gapped mirrors, policy enforcement, SLA-backed security reviews

**Residual risk:** Medium-High. You cannot prevent Anthropic from building this. What you can do is ensure that when they do, you have something they don't: enterprise customers, verified hook catalog, and a compliance story. The VS Code / Open VSX parallel is instructive — Microsoft built the dominant marketplace but open source alternatives (Open VSX) found a real niche.

---

#### P3: Anthropic deprecates or removes hooks entirely

**Probability: Low | Impact: Catastrophic**

An assessment of the product design makes this unlikely in the near term. Hooks are architected as the extensibility boundary of Claude Code. They are the mechanism that makes the agent governable for enterprise use — and enterprise is Anthropic's most important near-term revenue driver. Removing hooks would damage enterprise adoption significantly. Hooks are also specifically documented in the Claude Code enterprise docs as a compliance mechanism. That level of documentation commitment does not precede deprecation in healthy products.

The scenario under which this becomes more likely: if Anthropic pivots Claude Code's architecture significantly — for example, adopting a plugin system that supersedes hooks, or moving execution to a cloud sandbox that makes local shell execution hooks redundant. This is speculative but not implausible over a 5-year horizon.

**Mitigation:**
- Monitor Anthropic's architectural communications closely
- The private registry / enterprise features are defensible even if the hook system changes: the underlying need (audit trails, policy enforcement, supply chain verification for AI agent behaviors) does not go away even if the technical mechanism changes
- Build the business on the workflow problem (governing AI agent actions), not on a specific technical primitive (the hook event system). This makes pivoting possible if the architecture changes

**Residual risk:** Low in years 1-3. Rises to Medium in years 4-5 as the technical landscape evolves.

---

#### P4: Claude Code's growth stalls or reverses

**Probability: Medium | Impact: High**

The $100k MRR scenario requires Claude Code to reach several million active developers. As of March 2026, Claude Code's active user base is estimated in the hundreds of thousands to low millions range. That is enough to build a viable community product but not a large enterprise business.

Claude Code competes against Cursor (which has a large head start in some developer segments), GitHub Copilot (which has Microsoft distribution and VS Code integration), Gemini Code Assist, and whatever OpenAI ships in the coding agent space. Any of these could erode Claude Code's trajectory. Alternatively, Claude Code could dominate this space — the research doesn't answer which.

**Mitigation:**
- The $100k MRR scenario is explicitly a year 3-4 target, not year 1. The timeline already accounts for platform growth
- A sustainable lifestyle business ($20-40k MRR) is achievable with a much smaller Claude Code user base — principally through enterprise private registry deals with the organizations that already use Claude Code heavily
- Build the product as platform-agnostic where possible. A hook packaging and security standard that could be adapted to other AI coding agents (if they develop hook systems) extends the addressable market beyond Claude Code alone
- Watch the growth signal. If Claude Code installs plateau below 2 million active users by mid-2027, reassess the ceiling and plan accordingly

**Residual risk:** Medium. This is a platform bet and you are not in control of the platform.

---

#### P5: Anthropic ToS changes restrict third-party hook distribution

**Probability: Low | Impact: High**

Anthropic's current ToS does not prohibit building a third-party hook marketplace. The `plugin-marketplaces` documentation actively invites third-party marketplaces. A ToS change that restricts third-party hook distribution would be an unusual and damaging move that would harm Anthropic's developer ecosystem credibility.

The scenario under which this becomes more likely: a security incident caused by a hook distributed through a third-party marketplace creates enough reputational damage that Anthropic responds by restricting the ecosystem. This is the one pathway where a security incident on your platform creates a regulatory response from Anthropic itself.

**Mitigation:**
- Build and operate the marketplace with professional-grade security infrastructure. The best protection against a ToS restriction is not giving Anthropic a reason to issue one
- Maintain clear public documentation that you are an independent third-party service, not affiliated with Anthropic
- If a security incident occurs, respond with a responsible disclosure process that demonstrates professionalism. This matters for both your reputation and Anthropic's assessment of whether third-party marketplaces are responsible operators

**Residual risk:** Low as long as the marketplace operates responsibly and no major incident occurs.

---

### Security Risks

#### S1: A hook in the marketplace is weaponized (RCE, data exfiltration)

**Probability: High (over 3-5 year horizon) | Impact: Catastrophic if certified; High if uncertified**

This is not a theoretical risk. CVE-2025-59536 and CVE-2026-21852 (Check Point Research) document specific attack vectors for Claude Code project files: a malicious `CLAUDE.md` or hook configuration committed to a repository executes arbitrary commands on every team member's machine when they use Claude Code in that directory. Hooks are a privileged code execution primitive. They run shell commands automatically. A marketplace that distributes hooks is, from a threat modeling perspective, a distribution channel for arbitrary code execution.

The probability of this happening at some point in a multi-year operation is very high — not because the marketplace will be careless, but because sophisticated attackers will try, automated static analysis has limits, and the surface area grows with every new hook in the registry.

The impact is severity-dependent:
- **Certified hook weaponized:** Near-existential. You implied a level of trust you could not deliver. Enterprises that paid for private registry access have legal recourse. Regulatory attention is possible.
- **Uncertified hook weaponized:** Survivable with proper disclosure, clear ToS, and rapid response. The precedent is npm — malicious packages are regularly found and removed, and npm survives because the community understands that uncertified packages run at user risk.

**Mitigation:**
- Automated static analysis before any hook reaches the public registry: scan for `eval`, `curl | sh`, `base64 -d | bash`, `/etc/passwd` reads, API key exfiltration patterns, reverse shell patterns. Flag severe findings; block merge.
- The verified badge must be accompanied by a published, specific review methodology. "Verified" must mean "source code was reviewed against declared capabilities by a human reviewer and signed" — not "safe to run without understanding what it does"
- Maintain a responsible disclosure program with a public security hall of fame and a private reporting email
- Ship the security model before you ship the marketing. A marketplace with 1,000 hooks and weak review infrastructure is more dangerous than one with 10 hooks and a rigorous process
- Maintain an incident response playbook before launch: who is notified, in what order, with what timing. Practice the scenario: a verified hook is found to contain a data exfiltration payload
- Explore cyber liability insurance before reaching significant traffic (see Legal section)

**Residual risk:** Medium even with strong mitigations. You cannot prevent a sophisticated attacker from eventually submitting a hook that passes static analysis. You can contain the damage and respond professionally when it happens.

---

#### S2: Malicious hook submitted under a legitimate author's name (typosquatting, account compromise)

**Probability: Medium | Impact: High**

This is the npm typosquatting problem applied to hooks. A malicious actor registers `bash-gurad` or `bashguard` (one character difference) or compromises the GitHub account of a legitimate hook author and pushes a malicious update. Users who automate updates or search without careful attention install the malicious version.

For hook typosquatting specifically: because hooks run shell commands automatically, the damage from a typosquatted hook is worse than from a typosquatted npm package. A typosquatted npm package might exfiltrate environment variables; a typosquatted hook runs arbitrary shell commands inside the Claude Code execution context on every agent action.

Account compromise of a legitimate high-install hook author is arguably the higher risk — the attacker inherits trust rather than building it from scratch.

**Mitigation:**
- Namespace enforcement: authors must verify GitHub identity to claim a namespace. No two hooks can have names that differ by only edit distance 1 from each other
- Alert hook authors when a similarly-named hook is submitted to the registry
- Two-factor authentication requirement for any author with hooks above a threshold install count
- Require signed commits to the registry PRs for verified authors
- Monitor for suspicious update patterns: a hook that has been stable for six months and suddenly introduces a network call in a patch version should trigger a re-review
- Signed manifests mean that a compromised author account cannot push a malicious hook to the verified registry without access to the private review signing key — the signature check at install time will fail

**Residual risk:** Medium. Account compromise is an ongoing threat in any package ecosystem. The signing infrastructure materially reduces the damage window — a malicious update to a verified hook will not pass signature verification. Unverified hooks are more exposed.

---

#### S3: Supply chain attack via compromised hook update

**Probability: Medium | Impact: High**

Distinct from S2 in that this is an attack on the update distribution infrastructure itself, not on an author's identity. A compromised CDN, a hijacked GitHub Pages deployment, or a man-in-the-middle attack on the registry index could serve a modified hook to users running `hookpm update`.

This is the SolarWinds model applied to hook distribution: the attacker does not compromise the hook author — they compromise the build or distribution pipeline. The result is that a hook's source appears unchanged but the delivered artifact contains malicious modifications.

**Mitigation:**
- Cryptographic signing of manifests with a private key you control, verification at install time. A modified hook cannot pass signature verification without the private signing key
- Pin the registry index to a cryptographic hash at CLI release time, so CLI versions verify the registry has not been tampered with
- Serve the registry over HTTPS only; pin the certificate in the CLI for the official registry endpoint
- Maintain an audit log of every manifest signed, with timestamps and reviewer identity
- Follow Sigstore / cosign best practices for the signing infrastructure — these are established patterns for supply chain security in the package ecosystem

**Residual risk:** Low if signing infrastructure is implemented correctly. The residual risk is key compromise — if your private signing key is stolen, the attacker can sign malicious manifests. Store the private key in hardware or a properly secured secrets manager.

---

#### S4: Security review process is bypassed or gamed

**Probability: Medium | Impact: Medium**

A sophisticated attacker submits a hook that passes automated static analysis and human review — because the malicious behavior is obfuscated, is triggered only under specific conditions, or arrives in a subsequent update after the initial review. Hook code that phones home only when specific environment variables are present, for example, would not be caught by a review that runs in a sanitized environment.

This is a known limitation of code review for security purposes. No review process catches all sophisticated attacks. The npm ecosystem, JetBrains Marketplace, and VS Code Marketplace all have this problem. The question is not whether it can happen — it can — but what the damage radius is and how quickly it is detected.

**Mitigation:**
- Publish the review methodology in full. Users who install verified hooks should know exactly what was and was not checked. "Verified" means reviewed against capability declarations, not "safe"
- Annual re-review requirement for verified hooks: a hook that was clean in year one may have received malicious updates. Re-review surfaces changes
- Telemetry from the CLI (opt-in) that flags unusual network calls or subprocess spawning patterns from installed hooks, creating a community-level detection layer
- Rapid revocation: the ability to revoke a verified badge and push a signed revocation to all CLI instances within hours of discovery. A revocation notice at next `hookpm update` run is table stakes

**Residual risk:** Medium. This is a known limitation of static code review and is genuinely difficult to solve. The honest answer is that your security model reduces the probability of obvious attacks dramatically and buys time to detect sophisticated ones — it does not eliminate the risk.

---

#### S5: Legal liability when a marketplace hook causes damage

**Probability: Medium (incident) / Low-Medium (successful legal action) | Impact: High**

This is covered in depth in Part III. The summary for the register: the incident (someone is damaged by a hook they found through your marketplace) is more likely than not over a multi-year horizon. A successful legal claim against the marketplace depends heavily on ToS, jurisdiction, how the "Verified" badge is framed, and the specifics of the incident.

**Mitigation:** Covered in full in the Legal and Security Liability sections below.

**Residual risk:** Medium. You can reduce legal exposure significantly through well-drafted ToS, clear badge framing, and operational practices. You cannot reduce it to zero, particularly if a certified hook causes demonstrable damage.

---

### Business Risks

#### B1: Community forks the registry (the OpenTofu/HashiCorp scenario)

**Probability: Medium | Impact: Medium-High**

This is the most structurally predictable business risk. When HashiCorp changed Terraform's license to BSL, the OpenTofu fork launched within weeks and attracted thousands of stars and significant contributor support in months. The same pattern happened with Redis/Valkey, Elasticsearch/OpenSearch, and dozens of others.

The hook registry fork scenario: you begin monetizing in ways the community perceives as restricting access — charging for listing, adding rate limits to the CLI, making the registry index proprietary. Someone (or a coalition) forks the registry spec, re-indexes all existing public hooks, and launches "hookpm-open" as a community-operated, fully-free alternative. They will credibly argue that hook distribution should be public infrastructure.

The momentum risk is real. The community has existing organizational capacity: `hesreallyhim/awesome-claude-code` already has 21.6k stars. The `claudeforge/marketplace` project already exists. If either of those projects decides to fork the registry spec and run a competing service, they start with existing community trust and distribution.

**Mitigation:**
- Never charge for public registry listing. Never charge for CLI access to public hooks. Never restrict access to the public index. The moment any of these change, the fork becomes economically rational
- Keep the registry spec, the CLI, and the index format fully open source under a permissive license (MIT or Apache 2.0). The fork can copy the code — it cannot copy the install history, the verified catalog, or the enterprise customer relationships
- Charge only for services, not for access: human security review ($99-$299), enterprise private registry ($299-$2,000/month), hosted analytics. These are services that require ongoing operational labor to provide; they are not easily forked
- Be explicit about this governance model from day one. Write a public pledge: "The public registry will always be free to list and install. We charge for services, not access." This reduces the fork's rallying point

**Residual risk:** Medium. A fork is survivable if you have executed on the enterprise tier, because enterprise customers care about SLAs and security reviews more than ideology. A fork that captures the community layer while you capture the enterprise layer is a tolerable outcome — similar to how Open VSX and VS Code Marketplace coexist.

---

#### B2: GitHub Actions-style quality collapse (10,000 hooks, mostly junk)

**Probability: High (if the marketplace succeeds) | Impact: Medium**

This is not a risk in the traditional sense — it is a consequence of success. GitHub Actions Marketplace found that 65% of new actions duplicated existing tools within six months of rapid growth. npm has 2 million packages and is functionally unusable for discovery without curated lists. VS Code Marketplace has 60,000+ extensions with massive quality variance.

If the hook marketplace achieves the 1,000-hook target and the community contribution model works, the next phase produces 10,000 hooks — most of which are low-quality forks, abandoned projects, or minor variations on existing hooks. At that point, discoverability collapses, the community loses trust in the quality signal, and the "Verified" badge becomes the only meaningful trust mechanism.

**Mitigation:**
- Build curation into the product from the start, not as an afterthought. A "Featured" collection of 50-100 hooks that represent the best of the ecosystem is what users actually browse
- Weight the default search ranking toward verified hooks, high install count, and recent maintenance activity — not submission recency
- Allow hook authors to mark their hook as deprecated or superseded. The CLI warns when installing a deprecated hook
- Do not conflate catalog size with catalog quality in marketing. The goal is the most trustworthy and discoverable hook ecosystem, not the largest one
- Implement quality thresholds for the "Verified" tier: a hook that hasn't been updated in 24 months and has no maintainer response on issues does not keep its verified badge at renewal time

**Residual risk:** Medium. Quality collapse is a structural feature of open package ecosystems at scale. You manage it with curation, you do not eliminate it.

---

#### B3: Large IDE player (Cursor, VS Code, JetBrains) builds hook support and their own registry

**Probability: Low-Medium | Impact: High**

Cursor is the most likely candidate here. Cursor already competes directly with Claude Code and has a large developer audience. If Cursor implements a hook-equivalent system (Claude Code's lifecycle events mapped to Cursor's architecture), they have strong incentive to build a Cursor-native registry, and they have existing distribution to populate it quickly.

VS Code is a slower-moving organization but has built the dominant extension marketplace. If VS Code's GitHub Copilot integration adds hook-equivalent behaviors, Microsoft has the infrastructure and the install base to build a competing registry overnight.

JetBrains has 8,000+ plugins and an existing quality review process. If JetBrains adds Claude-equivalent agent behaviors to their IDE tooling, they will extend their existing marketplace rather than build a new one.

**Mitigation:**
- This risk is partially addressed by focusing on the Claude Code hook standard specifically. Cursor's hook model would be a different technical interface; your registry is not trivially compatible
- The enterprise private registry business is defensible regardless of who builds the public registry: enterprises need audit logs, SSO, and air-gapped mirrors no matter which tool is running the hooks
- The certified hook catalog and the security review infrastructure have value regardless of the distribution mechanism
- Do not build the business in a way that depends on being the only hook distribution mechanism. Build it to be the most trustworthy one

**Residual risk:** Medium. A large IDE player entering the space creates real competitive pressure on the community registry. It is survivable at the enterprise tier.

---

#### B4: Anthropic acquires or partners with a competing marketplace

**Probability: Low | Impact: High**

Anthropic could decide to build out their marketplace capabilities by acquiring an existing third-party marketplace — one of the existing `claudeforge` or `claude-market` projects — or by partnering with a company to build an official registry. This would not necessarily shut down an independent marketplace, but it would change the competitive dynamics significantly: the acquiring entity gets Anthropic's blessing, documentation links, and potentially preferential access.

**Mitigation:**
- Build and operate with enough professionalism that you are the obvious acquisition candidate if Anthropic decides to move in this direction
- The enterprise features are the protection: a marketplace with enterprise private registry customers is more valuable to Anthropic than one without. Build revenue before this becomes a concern
- Do not make the business dependent on organic Anthropic promotion

**Residual risk:** Low. Anthropic's track record suggests they prefer to let ecosystem tooling develop independently. The risk is real but unlikely to materialize in the near term.

---

#### B5: Revenue model fails — certification doesn't convert, enterprises don't pay

**Probability: Medium | Impact: High**

The revenue model depends on two conversion events: hook authors paying for the verified badge ($99-$299/year), and enterprises paying for private registry access ($299-$2,000/month). Both require things you do not control: a large enough hook ecosystem for certification to have social proof value, and enterprises that use Claude Code heavily enough to need compliance tooling.

The realistic certification conversion timeline is slow: 5-10% of hooks with active installs in the first 12 months. At 200 active hooks and 10% conversion, that is 20 certified hooks × $150 average = $3,000/year — meaningful validation but not a business. Enterprise conversion requires finding buyers, running sales conversations, and building features (SSO, audit logs) before you have confirmed demand.

The risk: you build the registry, grow the community, invest 6-12 months, and discover that hook authors will not pay for certification (they expect it to be free, like npm's security advisory) and that enterprises consider Claude Code an experimental tool not worthy of an enterprise tooling budget.

**Mitigation:**
- Test willingness to pay before building the full enterprise tier. Find 3-5 companies actively using Claude Code, interview them about their compliance requirements, and offer a beta contract before building SSO
- The certification model has a validation signal available early: create a waitlist for Verified review, charge $99 to join the waitlist. If you get 20 signups in month one, the demand is real
- Have a fallback revenue path: if certification and enterprise don't convert, the hosted analytics product (install telemetry, usage dashboards for hook authors) may be a lower-friction monetization path
- The lifestyle business scenario ($20-40k MRR) is achievable with far fewer enterprise customers than the $100k MRR scenario. Set the milestone as "prove the first paying enterprise customer" before committing to a second year of investment

**Residual risk:** Medium. Revenue model failure is the most likely cause of a quiet shutdown. The mitigation is early validation rather than late discovery.

---

### Operational Risks

#### O1: Solo founder burnout before reaching PMF

**Probability: Medium | Impact: High**

The product requires: CLI development, security review infrastructure, registry maintenance, hook author support, security incident response, enterprise sales conversations, content/SEO production, and community management. As a solo founder, all of this lands on one person. The security review program specifically requires ongoing attention: hook submissions, re-reviews, badge renewals, and incident response are not asynchronous tasks.

PMF for this product probably looks like: the CLI has 5,000+ installs, 3+ enterprise conversations in progress, and at least one paying customer. That milestone probably sits at month 12-18 based on realistic timelines. That is a long time for a solo founder to sustain without revenue or a team.

**Mitigation:**
- Design the week-1 scope to be achievable in a week. The research-recommended week-1 output (CLI + 10 hooks + registry + Show HN) is genuinely achievable by a single experienced developer in 5-7 days. Small early wins create sustainable momentum
- Automate the security review pipeline for unverified hooks from day one. Every hour spent on automatable review is an hour that doesn't compound
- Do not build the enterprise features until you have enterprise demand. Building SSO and air-gapped mirrors without a signed customer is a burnout accelerant
- Set explicit decision points: at month 6, assess CLI install growth, hook submissions, and pipeline conversations. If none of the metrics are moving, make the call to slow down or stop rather than grinding for another 12 months
- Find a community manager or a security reviewer to share the load before you need them. Even an unpaid contributor who handles hook submission PR reviews is a material workload reduction

**Residual risk:** Medium. Solo founder burnout is the most human and the most underestimated risk in this category. The decision point structure is the most important mitigation.

---

#### O2: Community expectations vs. monetization backlash (the Homebrew analytics controversy)

**Probability: Medium | Impact: Medium**

In 2021, Homebrew attempted to add opt-out analytics and a sponsored formula feature. The community response was significant: HN threads with hundreds of comments, forks threatened, maintainers publicly uncomfortable. The core tension: developers who rely on open infrastructure perceive any monetization as a betrayal of the implicit contract.

The hook marketplace will face a version of this. The moment you announce the certified badge at $99, someone will post "Show HN: hookpm now charges for basic security" and the framing will be wrong but the thread will get upvotes. The moment you add an enterprise tier with email capture, someone will post about it. The moment you add any form of analytics, the privacy thread will appear.

**Mitigation:**
- Publish the monetization model explicitly and early — in the README, in the launch post, in the contributing guide. "We charge for human security reviews ($99/year) and enterprise private registries ($299-$2,000/month). Everything else is free forever." Transparency disarms the gotcha
- Make the analytics opt-in, clearly documented, and minimal. Never use install telemetry for anything other than the stated purposes. Publish what is collected and what is not
- The Homebrew controversy was partly about surprise. If the community knows from launch day that certification costs money, the announcement of pricing is not news
- Build a community advisory structure: two or three well-known community members who are briefed on major product decisions before they are announced publicly. A community advocate saying "I reviewed this and think it's fair" is worth more than any launch post

**Residual risk:** Low-Medium. Some backlash is guaranteed. The severity depends on how transparent and early you are about the monetization model.

---

#### O3: GDPR/privacy requirements for user data in the registry

**Probability: High (as a compliance requirement) | Impact: Medium**

The registry will collect: hook install counts (aggregated or per-user, depending on implementation), author identity (GitHub handle, email), enterprise customer billing data, and potentially opt-in usage telemetry. Any EU-based user or author creates GDPR obligations. If you implement the enterprise private registry with SSO, you are processing personal data for EU employees.

This is not an optional risk to accept — GDPR compliance is legally required if you have EU users or customers, and you will.

**Mitigation:**
- Design the data model with privacy first: aggregate install counts rather than per-user installation records. If you do not store which users installed which hooks, you cannot be asked to produce that data under GDPR
- Use a GDPR-compliant payment processor (Stripe operates under SCCs) and a GDPR-compliant email provider from day one
- Publish a clear privacy policy that specifies exactly what is collected, how it is used, and how to request deletion
- Do not store more author or user data than you need to operate the service
- Consult with a legal professional in the EU context before onboarding your first EU enterprise customer — enterprise contracts in regulated industries often have specific data processing agreement (DPA) requirements

**Residual risk:** Low if addressed proactively. Medium if addressed only after the first enterprise customer demands a DPA.

---

#### O4: Hook security incident during a high-visibility period

**Probability: Low-Medium | Impact: High**

Timing risk: a security incident that would be manageable in obscurity becomes significantly worse if it coincides with a major launch event, a conference talk, or a period of high press attention. An RCE discovered in a hook during the week your Show HN post is trending would create a compound reputational problem — the audience you reached through marketing is the same audience reading the security disclosure.

**Mitigation:**
- Do not time major marketing pushes (conference talks, press outreach, paid promotion) to coincide with periods of rapid hook catalog growth
- Maintain a private disclosure process that allows you to remediate before going public. A responsible disclosure program with a defined window (typically 90 days for coordinated disclosure) gives you time to remove the hook, notify affected users, and prepare a public statement before the vulnerability is announced
- Have the incident response playbook written before you need it. The hour after discovery of a weaponized hook is not the time to decide who gets notified in what order

**Residual risk:** Low-Medium. Incident timing is partly luck. The mitigation is having the incident response process ready so that timing does not compound the damage.

---

## Part II: Scenario Analysis

### Scenario 1: Strong Success

**Timeline:** 36 months
**Required conditions:**
- Claude Code active user base reaches 5+ million developers by end of 2027
- Anthropic does not build a competing official registry
- The certified badge conversion rate reaches 8-10% of hooks with >100 installs
- Two or more enterprise customers at the Business or Enterprise tier by month 18

**Path:**
- Month 1-6: CLI launch, community growth, 500+ hooks in registry, 5,000+ CLI installs
- Month 7-12: Certified badge launched, first 20-30 paying authors, first enterprise conversations converting
- Month 13-24: 3-5 enterprise customers at $799-$2,000/month, certification revenue growing to $8k/month amortized, total MRR approximately $20-25k
- Month 25-36: Enterprise scale — 5 Enterprise + 15 Business + 40 Team + strong certification revenue → $100k MRR

**Revenue at $100k MRR:** $1.2M ARR. Exit multiples for developer tooling SaaS typically run 5-10x ARR at this scale, suggesting a $6-12M acquisition range.

**Exit buyers:** Anthropic (platform control), JetBrains (developer tooling roll-up), a DevTools company (Sourcegraph, Swimm, Snyk). Note that an Anthropic acquisition becomes more likely as the marketplace's strategic importance to Claude Code grows — at $100k MRR with enterprise customers, you represent significant Claude Code ecosystem leverage.

**Assessment:** This is the right-tail scenario. It requires both strong platform growth (not in your control) and strong execution (in your control). It is achievable but not the base case.

---

### Scenario 2: Moderate Success — Sustainable Lifestyle Business

**Timeline:** 48 months
**Required conditions:**
- Claude Code active user base reaches 2-3 million developers
- Anthropic does not build a competing official registry
- Certification converts at 5% rather than 10%
- Enterprise pipeline closes slowly — 1-2 customers per quarter rather than 1-2 per month

**Path:**
- Month 1-12: Community growth phase, CLI installs, no revenue
- Month 13-24: Certification revenue: ~$15k/year from 150 certified hooks. First 2-3 Team customers: ~$900/month. Total MRR: ~$2k
- Month 25-36: Gradual enterprise growth. 1 Business customer, 5 Team customers, certification growing. MRR: ~$7k
- Month 37-48: 2 Business + 8 Team + 1 small Enterprise + certification. MRR: $20-30k

**Revenue:** $20-40k MRR at 48 months. As a solo or 2-person team, this is a profitable, sustainable business.

**Assessment:** This is probably the base case given realistic Claude Code growth assumptions and realistic enterprise sales cycle length. Not spectacular, but a real business. The question is whether 48 months of investment to reach a lifestyle business is a good use of the founder's time — that depends entirely on personal circumstances and what else you would build.

---

### Scenario 3: Anthropic Builds the Official Registry

**Timeline:** Most likely if it happens at all, months 18-36. Could happen earlier if the ecosystem grows faster than expected.

**Signal to watch:** If `hesreallyhim/awesome-claude-code` exceeds 50k stars and a "hook marketplace" discussion appears in developer forums as a top-10 Claude Code request, Anthropic has enough signal to justify building first-party infrastructure.

**What Anthropic builds:** Almost certainly a community discovery layer — search, install counts, basic categorization. Probably not: security reviews, certified badges, enterprise private registry, audit logs, SSO, air-gapped mirrors.

**What survives:**
- The security and compliance layer: certification, verified badges, detailed capability declarations. Anthropic will not want to own security review liability
- The enterprise private registry: regulated industries cannot use Anthropic's public registry directly. They need audit logs, SSO, and policy enforcement that Anthropic will not build
- The historical install data and community trust built before Anthropic's launch

**Pivot positioning:** "Enterprise security and compliance layer for the official Claude Code registry." You are no longer competing for the public registry; you are a complementary service. This is the Open VSX / VS Code Marketplace coexistence model, or the Sonatype / Maven Central model: the public registry exists, the enterprise layer is a separate product.

**Assessment:** This scenario is survivable and possibly beneficial if you have executed on the enterprise tier before Anthropic launches. It is bad only if you have built nothing but a public registry by the time Anthropic enters. The implication: build the enterprise features earlier than the revenue timeline strictly requires, so they exist before this scenario materializes.

---

### Scenario 4: Security Incident

**The incident:** A hook in the marketplace is found to contain an RCE payload or data exfiltration mechanism. It has been installed on users' machines. Damage has occurred.

**Certified hook incident — Assessment: Near-existential**
You implied a level of verified safety you could not deliver. Enterprise customers with contractual SLAs have grounds for termination. Depending on jurisdiction and the specifics of your "Verified" badge language, you may have implied warranty exposure. The reputational damage among security-conscious developers — your most important audience segment — is severe. Recovery is possible but requires a complete security process overhaul, public post-mortem, and sustained evidence of improvement over 12-18 months.

**Uncertified community hook incident — Assessment: Survivable**
If your ToS is properly drafted, the "Verified" badge has been clearly differentiated from community hooks, and you respond quickly and professionally, this is manageable. The npm parallel: npm regularly discovers and removes malicious packages. npm survives because the community understands that uncertified packages carry inherent risk. Your response determines whether the incident kills the marketplace or builds credibility through responsible handling.

**Response protocol (should exist before launch):**
1. Remove the hook from the registry within 2 hours of confirmed report
2. Revoke the signed manifest if verified; push a signed revocation notice to all CLI instances
3. Notify all users who installed the affected hook version (requires an opt-in notification channel — build this)
4. Publish a disclosure within 48 hours: what happened, what capabilities the hook declared versus what it actually did, how many users were affected, what you are doing to prevent recurrence
5. Post-mortem within two weeks: detailed analysis of how the hook passed review, what process changes have been made

**Assessment:** Plan for this incident before it happens. The response quality matters more than the incident itself. npm, PyPI, and RubyGems have all had high-profile supply chain incidents and survived because they responded with transparency and process improvements.

---

### Scenario 5: Community Fork

**The trigger:** Monetization announcement — certification pricing, enterprise tier announcement, or any perceived restriction on the public registry — prompts a coalition to fork the registry spec as "hookpm-open."

**Assessment:** Real risk, following the exact pattern of HashiCorp/OpenTofu. The fork gets significant community support in the first 30 days because the argument ("hook distribution should be public infrastructure") is structurally appealing to developers. If the fork is backed by a well-known developer or an organization with resources, it gains critical mass quickly.

**What the fork gets:** The spec (MIT licensed), the CLI code (MIT licensed), the hook manifests (hook authors can dual-submit), the community narrative.

**What the fork does not get:** Your install history, your verified catalog, your enterprise customers, your security review infrastructure, your signing keys, your operational relationships.

**Mitigation in the moment:** Do not fight the fork publicly. The response is to acknowledge the fork, reaffirm the public pledge ("listing is free forever"), and continue executing on the enterprise layer. Fighting a fork makes you look closed. Ignoring it and continuing to build trust makes you look stable.

**Assessment:** A fork is survivable if you have enterprise customers and a certified catalog. A fork that successfully captures the community layer while you capture the enterprise layer is a tolerable long-term outcome. A fork becomes existential only if you have nothing but the community registry — which is why the enterprise tier must be built before the community grows large enough to support a fork.

---

### Scenario 6: Slow Death

**Conditions:** Claude Code user growth stalls below 2 million active users. The hook ecosystem remains small enough that certification revenue is negligible and enterprise deals don't close because Claude Code is still perceived as experimental. Hook author submissions slow down. CLI install growth plateaus.

**Timeline:** This becomes apparent by month 18-24 if the growth metrics are not materializing.

**Assessment:** This is the most likely cause of quiet shutdown. Not a dramatic incident — just insufficient market pull to make the unit economics work. If by month 18 you do not have: 3,000+ CLI installs, 100+ hooks in the registry, 5+ enterprise conversations in progress, and at least one paying customer, the ceiling has revealed itself.

**Exit strategy:** Do not let this drag. If the signals are clear at month 18, act:
1. Publish a clear public statement about the decision to wind down
2. Transfer the registry to a community steward (the `hesreallyhim/awesome-claude-code` maintainer is the obvious candidate)
3. Open source everything, including the CLI, registry tooling, and security review methodology
4. Remove enterprise customer data and notify them with adequate notice

A clean shutdown with full OSS handoff builds the kind of reputation that matters for your next project. A slow, undead continuation of a product nobody uses does not.

---

## Part III: Legal and Liability Framework

### Terms of Service Structure

The ToS must accomplish three things: clearly define what you are (an index service, not an executor), establish the liability limits for hook code, and create the legal framework for enterprise service agreements.

**What you are:**
The marketplace is a directory service. You index hook manifests submitted by third-party authors. You do not execute hooks. You do not control what hooks do when they run on a user's machine. You facilitate discovery; execution is entirely at the user's discretion. This framing — consistently maintained in ToS, documentation, and marketing — is the foundation of your liability position.

**Reference model:** VS Code Marketplace's terms state that Microsoft does not review extensions for security or fitness for purpose and that users install at their own risk. npm's terms similarly disclaim responsibility for package behavior. Both have survived significant security incidents without successful legal action against the registry operator, partly because these disclaimers are clear and prominently presented.

**Key ToS provisions:**
- Authors represent and warrant that submitted hooks do not contain malicious code, violate intellectual property rights, or violate applicable law. Breach of this warranty by an author is the author's legal exposure, not yours
- Users acknowledge that hooks execute as code on their local machines with whatever permissions Claude Code has. Installation constitutes acceptance of this risk
- The "Verified" badge represents completion of a defined review process (enumerated specifically in the ToS), not a guarantee of safety or absence of vulnerabilities
- You reserve the right to remove any hook from the registry at any time for any reason, with or without notice
- Limitation of liability: damages capped at the amount paid to you in the preceding 12 months (standard enterprise SaaS limitation clause)
- Governing law: choose a US state (Delaware is conventional for US startups) and require arbitration for disputes below a threshold

**Enterprise agreements:** Enterprise private registry customers need a separate Master Service Agreement (MSA) or Order Form that covers SLA terms, data processing obligations (DPA for GDPR), security responsibilities, and audit rights. Do not use the consumer ToS for enterprise customers.

---

### Liability Disclaimers for Marketplace Hooks

The certification badge creates the most complex liability question. Consider two framings and their implications:

**Framing A (weaker):** "Verified hooks are safe to use."
This is a guarantee of outcome that you cannot deliver. If a verified hook causes damage, you have made a representation you did not fulfill. This framing creates implied warranty exposure in common law jurisdictions and may be treated as a consumer protection violation in some EU member states.

**Framing B (correct):** "Verified hooks have been reviewed by our security team against the capability declarations in their manifest. Our review process includes automated static analysis and human source code review. Our review does not include runtime sandboxing, execution testing in all possible environments, or a guarantee of absence of all malicious patterns. See our security review methodology for the specific checks performed."

Framing B is honest, specific, and defensible. It describes a process, not an outcome. It is the approach Apple uses for App Store review ("we review apps for basic functionality and policy compliance; we do not guarantee apps are bug-free or secure") and the approach Figma uses for plugin review.

The security review methodology must be published in full and updated whenever it changes. If a malicious hook passes your review process, the question will be whether your documented process was reasonable — not whether you made a guarantee.

---

### DMCA Considerations

Hook code submitted to the registry is subject to DMCA takedown requirements if you are a US-based operator. Establish a DMCA agent (registered with the US Copyright Office), publish a DMCA policy, and build a takedown workflow.

The more common scenario: a hook author submits a hook that is a direct copy of another author's code without attribution. Handle these through your contributing guidelines (requiring original work or proper license) and a dispute resolution process. DMCA takedowns for code are legally complex — the GPL and MIT licenses that most hooks will use allow redistribution — but the dispute resolution process needs to exist.

---

### EU AI Act Implications

The EU AI Act (effective phases through 2026-2027) includes provisions for high-risk AI systems and general-purpose AI models. Claude Code hooks are not, in themselves, AI systems — they are governance tooling that wraps an AI agent. Whether hooks constitute "AI system components" under the Act's definitions is not settled.

The more relevant EU AI Act consideration: if enterprises use hook marketplace hooks to implement required compliance controls for AI systems (which is a plausible use case — a hook that enforces output logging could be used to satisfy an AI Act transparency requirement), those enterprises need to document the hook as part of their compliance evidence. This creates demand for your audit log and signed manifest documentation features, not legal exposure.

If you have EU enterprise customers, consult with an EU-based technology lawyer on whether your registry operations create any obligations under the Act. This is a currently evolving area and the answer will change as guidance develops.

---

### How Comparable Platforms Handle Liability

**npm:** npm's terms disclaim any warranty on package behavior. npm does not review packages for security before publication. When malicious packages are discovered, npm removes them and publishes advisories through the npm security advisory database. npm has not been successfully sued for damages caused by malicious packages, as far as public record shows.

**GitHub Actions Marketplace:** GitHub's terms state that Actions are third-party software and GitHub does not endorse or review them for security. GitHub removes Actions that violate ToS when reported. The Actions Marketplace has had high-profile supply chain attacks (the `tj-actions/changed-files` incident in 2023 is the canonical example) without successful legal action against GitHub.

**Figma plugins:** Figma reviews plugins before publication — checking for policy compliance and basic security — but explicitly does not guarantee plugin security or behavior. Figma's sandbox model (plugins run in a sandboxed iframe) provides a technical limitation on damage that hooks do not have.

**VS Code Marketplace:** Microsoft reviews extensions for basic compliance but not security. Microsoft's terms disclaim responsibility for extension behavior. VS Code extensions have a much broader attack surface than Figma plugins (they execute as Node.js processes with local filesystem access) and the marketplace has had significant supply chain incidents without successful legal action against Microsoft.

The pattern: major platform operators have consistently used clear disclaimer language, a published review process, and rapid removal of reported malicious content as their liability framework. Courts have generally upheld this framework under Section 230 (for US operators) and equivalent provisions, as long as the operator does not claim to guarantee safety.

---

## Part IV: The Security Liability Question in Detail

### If a Certified Hook Causes Damage: Legal Exposure

This is the hardest question and deserves a direct, unhedged answer.

**The exposure depends entirely on how "Verified" is communicated.** If your marketing language, badge design, and UX suggest that certified hooks are "safe," you have made a representation that creates implied warranty exposure. If your documentation clearly states what was reviewed and what was not, you have a defensible position.

Assume the worst-case scenario: a verified hook is found to contain a credential exfiltration payload. A developer at a financial services firm installed it, and API keys were exfiltrated, resulting in $50,000 in unauthorized API charges.

**The legal theories the plaintiff's attorney will pursue:**
1. **Negligence:** You had a duty of care as a security-review marketplace, you breached that duty by not catching the payload, and the breach caused damage. This is the strongest theory.
2. **Implied warranty:** Your "Verified" badge created an implied warranty of merchantability (that the hook is fit for its stated purpose), and the hook was not.
3. **Misrepresentation:** Your security review marketing overstated what the review actually checked.

**The defenses:**
1. **Disclaimer of warranty:** If the ToS clearly states that certification is a process-review, not a safety guarantee, and the ToS was accepted as part of installation, the implied warranty theory fails.
2. **Contributory negligence:** The user chose to install a hook that runs shell commands on their machine, accepts risk by doing so, and had the ability to review the source code themselves.
3. **No privity / no guarantee:** You are an index service. You never executed the hook. You facilitated discovery.

**The realistic outcome:** In the US, a small claims action is unlikely to succeed given the disclaimer language if it is well-drafted. A class action by multiple affected developers is possible but expensive to mount and unlikely to be certified (class certification requires common questions of law and fact, which are hard to establish for security incidents with different factual circumstances). In the EU, consumer protection law is more plaintiff-friendly and disclaimers have less force — EU enterprise customers need specific contractual clarity.

**The practical answer:** Draft the disclaimer language carefully, have it reviewed by a technology lawyer before launch, and maintain cyber liability insurance. The insurance question is real: product liability insurance for software is available and not prohibitively expensive for an early-stage product. Talk to a broker with technology client experience. Policy limits of $1-2M are achievable for a few thousand dollars per year. This is worth doing before the first verified hook is issued.

---

### How npm, GitHub Actions, and Figma Handle Certification Liability

**npm:** npm does not certify packages. It scans for known vulnerabilities (via the npm audit database) but makes no representation that packages are secure. The audit database is opt-in tooling, not a certification program. npm's liability model is: we are a registry, not a reviewer.

**GitHub Actions:** GitHub does not certify Actions. The "verified creator" badge on GitHub Actions Marketplace means the creator's GitHub account has been verified as belonging to the stated organization — it says nothing about the code's security. This is an identity verification, not a code review. This is a useful distinction for your own badge framing.

**Figma plugins:** Figma reviews plugins before publication and runs them in a sandboxed iframe with limited DOM access and network restrictions. Figma's review is more rigorous than most marketplaces and the technical sandbox materially limits damage. Figma's terms still disclaim warranty on plugin behavior. The sandbox is the key protection Figma has that you do not — hooks run as shell commands, not in a WASM sandbox.

**The applicable principle for hooks:** Because hooks run as shell commands with local system access, the damage potential is higher than Figma plugins and comparable to VS Code extensions. The VS Code Marketplace model is the closest analogue: review for basic policy compliance, publish the review criteria, disclaim security guarantees, maintain rapid removal capability. VS Code has survived significant security incidents using this model.

---

### Recommended Approach: Certification Certifies the Process, Not the Outcome

The hook marketplace should adopt this specific language for the verified badge, and use it consistently everywhere:

> "Verified by [Marketplace Name]" means that a human reviewer has read the full source code of this hook, confirmed that the capabilities declared in the hook manifest match the code's observable behavior, and found no known dangerous patterns based on the review criteria published at [link]. This review does not include runtime execution testing, sandbox validation, or a guarantee that the hook contains no vulnerabilities or malicious code that is outside the scope of our published review criteria. Hooks run with the permissions of your Claude Code process on your local machine. Install only hooks you trust.

This framing:
- Certifies the review process with specificity (which is defensible)
- Discloses what was not checked (which is honest and legally important)
- Does not certify the outcome (which you cannot guarantee)
- Puts the user on notice about the execution model (which is a contributory negligence argument if needed)

Publish the full review criteria as a living document. When a hook passes review, link to the specific review criteria version that was applied. This creates an audit trail that shows exactly what was promised and what was delivered.

---

### Insurance Considerations

Cyber liability insurance for a software-as-a-service product covers:
- First-party costs from a security breach (incident response, notification costs, credit monitoring for affected users)
- Third-party liability claims from affected parties
- Regulatory defense costs (relevant for GDPR investigations)

**When to buy it:** Before issuing the first verified badge. The exposure does not exist until you have made a representation that could be relied upon. The moment you certify a hook, you have a potential liability event.

**What it costs:** For a startup without significant revenue, expect $3,000-$8,000 per year for a $1-2M policy limit from a technology-focused insurer (Coalition, Corvus, or an equivalent). The premium scales with revenue and coverage limit.

**What it does not cover:** Intentional wrongdoing, known pre-existing incidents, and contractual liability above the policy limits. Read the exclusions carefully.

Consult a technology-focused insurance broker rather than a general business insurance agent. The technology-specific policies have significantly better coverage for software liability scenarios.

---

## Summary: The Five Things That Will Determine the Outcome

1. **Whether you build the security infrastructure before you build the scale.** Every other risk is manageable if this is true. An early security incident on an unreviewed catalog is the scenario that ends the project before it starts.

2. **Whether Claude Code's user base reaches 5 million active developers by 2028.** This is the platform bet that determines whether the $100k MRR scenario is accessible. You cannot control it. You can observe it clearly and make rational decisions as the data comes in.

3. **Whether you validate enterprise willingness to pay before investing 12 months in enterprise features.** The revenue model is the most controllable failure mode. Test it early with real conversations and real contracts.

4. **Whether Anthropic builds a competing registry before you have enterprise customers.** This is the existential risk that the entire architecture should be designed to survive. The enterprise tier is the answer.

5. **Whether you treat the first security incident — when it comes — as a character-defining moment rather than an emergency.** The response to the first incident (response speed, transparency quality, process improvement documentation) will do more for long-term trust than any marketing.

---

*Prepared 2026-03-10. Review and update at months 6, 12, and 18, or immediately upon any material change in Anthropic's hook API, Claude Code's market position, or an industry security event affecting comparable marketplaces.*
