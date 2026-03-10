# Market Opportunity: A Claude Code Hook Marketplace

**Document type:** Strategic opportunity assessment
**Audience:** Founder evaluating whether to build this; investor evaluating whether to fund it
**Date:** March 2026

---

## Summary

Claude Code hooks are a programmable execution interception layer that sits between an AI agent's intent and actual system action. They are security controls, quality gates, and orchestration primitives all in one mechanism. Developers have been building with them for roughly nine months and the sharing infrastructure has not kept up: hooks are distributed by copy-pasting GitHub URLs. No signed hooks exist. No one-command installer exists. No versioning, no search by event type, no capability manifests, no security review.

The situation is structurally identical to 2009-era JavaScript before npm: a real ecosystem with genuine utility, no standard distribution layer, and a window — roughly 12-18 months — before the absence of a standard becomes painful enough that someone builds one and owns it permanently.

This document makes the case that this is a real opportunity, honest about the scale constraints, and precise about what has to be true for it to work.

---

## 1. Why Claude Code Is the Right Platform

The question is not whether AI coding assistants will have large developer communities. They already do. The question is which platform is the right one to build for first, and whether the timing is early enough to matter.

### The Platform Signal

**SWE-bench performance.** Claude Opus 4.5 achieved 80.9% on the SWE-bench verified benchmark as of late 2025. This is not a marketing metric — SWE-bench measures the ability to resolve real GitHub issues in real codebases with no human assist. At 80.9%, Claude Code is capable enough that developers use it for substantial, autonomous coding work rather than simple autocompletion. That capability level is what creates demand for hooks: you only need guardrails and governance for an agent that's actually doing consequential things.

**Enterprise adoption, by name.** TELUS and Rakuten are among the documented enterprise adopters. Named enterprise references in a product this young signal that procurement teams have done security reviews, that legal has signed off, and that IT has approved it at organizational scale. Enterprise adoption is the leading indicator of where the enterprise tooling ecosystem will form.

**Revenue trajectory.** Anthropic is on a $1 billion ARR trajectory. The relevance to a hook marketplace is not the absolute number — it is what that ARR level implies about the stability of the platform. A company generating $1B ARR is not going to discontinue the product that generates it, which means the API a hook marketplace depends on will continue to exist and receive investment.

**Developer community momentum.** `hesreallyhim/awesome-claude-code` had 21.6k GitHub stars and 1.2k forks as of January 2026. Hacker News threads about Claude Code hooks consistently reach the front page. The Show HN for `cc-hooks-ts` received meaningful engagement. The DEV Community post "Claude Code Must-Haves January 2026" was widely shared. These are qualitative signals, not revenue signals — but they are the precursor pattern to a marketplace opportunity. Communities form around tools that matter; marketplaces form around communities that have formed.

### The Structural Advantage Over Competing Platforms

Claude Code is not the only AI coding assistant. Cursor, GitHub Copilot, Gemini Code, and others have comparable or larger user bases. The reason a hook marketplace makes more sense here than on those platforms: Claude Code's hooks system is uniquely powerful and uniquely open.

Hooks in Claude Code fire inside the agent's decision-execution loop — not alongside it. A Claude Code hook can intercept Claude's intent before execution, rewrite tool arguments silently, replace what Claude sees as a tool's output, and block Claude from declaring success until external verification passes. This is qualitatively different from VS Code extension points or Copilot plugins, which extend the UI layer rather than governing an autonomous execution loop. The depth of the hook surface creates proportional demand for a distribution and trust layer.

Anthropic has also deliberately left the hook ecosystem to third parties. Their `anthropics/claude-plugins-official` repository is an example implementation, not a product. Their `plugin-marketplaces` documentation specifies the protocol and tells developers how to build marketplaces — a clear signal that they intend for the community to build this infrastructure, not Anthropic.

---

## 2. The Gap That Exists Today

### What Exists

Several things exist. None of them are a hook marketplace.

**`hesreallyhim/awesome-claude-code`** (21.6k stars, 1.2k forks) is the primary community resource. It has a dedicated Hooks section. It links to individual GitHub repos. It is a curated list of links in a Markdown file. No install tooling, no versioning, no ratings, no security model. Browsing the list and finding a useful hook still requires navigating to the repo, reading the README, manually copying the script, and hand-editing your `~/.claude/settings.json` to add the hook configuration block. This is the state of the art.

**Broad plugin marketplaces** — `claudeforge/marketplace` (161 plugins, CLI install commands), `hyperskill/claude-code-marketplace`, `claude-market/marketplace`, `Dev-GOM/claude-code-marketplace` — exist as GitHub repos with varying activity levels. In each, hooks are one component type inside a broader plugin schema. They are not the primary focus. Install experience varies from copy-paste to a basic CLI command. Security review is nonexistent. Hook-specific search (e.g., "show me all `PreToolUse` hooks that block bash commands") is not possible.

**Dedicated hook code libraries** — `karanb192/claude-code-hooks`, `disler/claude-code-hooks-mastery`, `johnlindquist/claude-hooks` — are the actual content that exists. These are code repositories with hook scripts and README files. No discoverability layer, no install UX, no versioning, no search.

**npm packages** — `@constellos/claude-code-kit`, `claude-code-templates` (100+ hooks, agents, MCPs), `claude-flow` — attempt distribution through npm. The npm approach has a structural mismatch: npm installs code; hooks install behaviors into a JSON configuration file that controls an AI agent's execution loop. The installation mechanics are different, and the npm model carries npm's security hygiene problems into a context where the security stakes are higher.

**Official Anthropic resources:** The hook reference documentation, the hooks guide, the `plugin-marketplaces` protocol, and the official plugin directory. Anthropic provides the schema and the protocol. They have explicitly built the infrastructure for community marketplaces to exist and left the curated registry layer to third parties.

### The Gap, Precisely Stated

The following capabilities do not exist anywhere in the current ecosystem:

| Capability | Current State |
|---|---|
| Search hooks by event type (e.g., all `PreToolUse` hooks) | Not possible |
| One-command install: `hookpm install security/bash-guard` | Does not exist |
| Hook versioning and update notifications | Does not exist |
| Security review and capability declarations | Does not exist |
| Cryptographic signing and verification | Does not exist |
| Ratings and install counts as quality signals | Does not exist |
| Audit trail of installed hooks | Does not exist |
| Scoping metadata (per-project vs. global) | Does not exist |
| Enterprise private registry with SSO | Does not exist |

This is not a UX improvement on something that already works. The entire distribution, trust, and governance layer for this ecosystem is absent. The analogy to 2005-era package management before npm is not hyperbolic — it is the accurate description of the current state.

### The Security Dimension of the Gap

CVE-2025-59536 and CVE-2026-21852 (Check Point Research) document RCE and API token exfiltration via Claude Code project files. The attack vector is specific: a malicious `CLAUDE.md` or hook configuration committed to a shared repository executes arbitrary commands on every contributor's machine when they use Claude Code in that directory. Hooks, by design, run shell commands. A hook in `.claude/settings.json` committed to a shared repo is a privileged code execution primitive that every contributor runs without review.

The community has no tooling to assess hook safety before installation. Installing a hook from a public repository is presently equivalent to running an untrusted shell script with the permissions of an AI agent that has access to your filesystem, API keys, and development environment.

This is not a theoretical edge case. The CVEs were published. The attack surface is real and named. Security awareness in the Claude Code community is fresh in a way that it will not be in 18 months, when the incidents will have either accumulated or been addressed. The window for building trusted infrastructure before the first major supply-chain incident through a hook is narrow.

---

## 3. Who the Customer Is

Three personas exist with meaningfully different needs and willingness to pay.

### Persona 1: The Individual Developer

This person uses Claude Code daily, has read the hooks documentation, has maybe copy-pasted one or two hooks from GitHub, and is aware that they're probably leaving value on the table by not setting up more. Their actual behavior: they will spend 20 minutes reading about hooks, decide they want a bash-guard and an auto-formatter, fail to find a trustworthy source quickly, and either abandon the search or spend an hour assembling something from three different GitHub repos.

What they want: install 3-5 hooks in under 5 minutes without editing JSON by hand, from a source they trust enough to run on their machine. They are not going to pay for this — they expect it to be free, and correctly so. The individual developer is not the revenue customer. They are the distribution mechanism.

Their value to the marketplace: every developer who installs hooks from your registry is a data point (install counts, ratings) that makes the registry more useful for the next developer and more trustworthy for the enterprise buyer.

### Persona 2: The Engineering Team

This person is a senior engineer or engineering manager at a company with 5-50 developers using Claude Code. They have already observed the problems that arise from ungoverned hooks: different team members have different hooks installed, nobody knows which hooks are running in CI, a junior engineer copied a hook from GitHub that nobody reviewed, and there is no audit trail for what ran on which machine.

What they want: shared hook configuration across projects, a known-good set of team-standard hooks, some assurance that the hooks they're distributing haven't been tampered with, and some visibility into what's installed. They will pay for this — approximately $300/month for a team-level private registry with audit logs and SSO. The per-developer cost at this price point ($12-60/developer/month depending on team size) is well within range for infrastructure that their developers use daily.

### Persona 3: The Enterprise

This person is a CISO, a head of engineering, or a procurement evaluator at a regulated company — finance, healthcare, defense, a large technology company with a formal vendor approval process. Claude Code is already deployed or being evaluated. The question is whether it can be deployed safely at scale with the hooks system enabled.

What they want: a private hook registry with SSO/SAML (required to get on the approved vendor list), audit logs (required for compliance), the ability to allowlist which public hooks are permitted and denylist the rest, signed hooks they can verify, and optionally an air-gapped mirror for environments that cannot reach the public internet. They will pay $2,000-5,000/month for this. The willingness to pay is grounded in comparables: GitHub Enterprise is $21/developer/month, JFrog Artifactory enterprise starts at ~$1,500/month. A hook registry is a narrower surface area, which is reflected in the pricing, but the compliance infrastructure is the same purchase decision.

The enterprise buyer cannot use shared hooks without this layer. Today, they literally cannot use shared hooks at all — there is no audit trail, no signing, no governance mechanism. The marketplace creates the category of "hooks an enterprise can use."

---

## 4. Market Sizing

### The Honest Starting Point

Claude Code's active user base is in the hundreds of thousands to low millions range as of early 2026. This is not VS Code's 30 million developers. It is not GitHub's 150 million registered users. It is a real but early community, and the market size numbers that follow reflect that honestly.

The sizing exercise is useful not to produce an impressive TAM number but to establish whether the opportunity is worth pursuing at current scale and what it looks like if the platform grows.

### Comparable Markets

**VS Code Extension Marketplace:** 30 million active VS Code users. More than 60,000 published extensions. $25M+ paid to extension developers in 2024 through the marketplace's paid extension program. The marketplace drives indirect revenue for Microsoft through Azure and GitHub lock-in. This is the 8-year-ahead version of what a Claude Code hook marketplace could look like if Claude Code achieves comparable developer penetration.

**GitHub Actions Marketplace:** 20,000+ actions listed. 6 billion+ workflow runs per month. The marketplace is free; it drives GitHub Actions compute billing, which is estimated to contribute $200M+ annually to GitHub's revenue. The hook marketplace analogue: free public registry drives paid enterprise features and verified badges.

**npm:** Billions of downloads per month. 82% of download demand comes from less than 1% of IP addresses. Sustained on volunteer and charitable funding with a structurally broken sustainability model. The npm comparison is the cautionary tale — not the aspirational target.

### TAM/SAM/SOM Applied to a Hook Marketplace

**Total Addressable Market (TAM):** All developers using AI coding assistants who write or consume hooks. As of early 2026, the AI coding assistant category has tens of millions of users across all platforms (Cursor, Copilot, Claude Code, Gemini Code, and others). If hooks — or their equivalent — become a universal feature of AI coding assistants, the TAM is roughly comparable to the VS Code extension market: 30-50 million developers, with a hook marketplace revenue opportunity of $50-100M ARR at mature VS Code-like scale. This is a 5-10 year number, not a year-1 number.

**Serviceable Addressable Market (SAM):** Claude Code users specifically who are potential hook marketplace users. Estimate: 500,000-2,000,000 active Claude Code users in early 2026. Assume 20% will ever install a hook — a conservative estimate given that 21.6k people have already starred the awesome-claude-code list. Serviceable market: 100,000-400,000 hook-installing developers. Of those, roughly 5% work at organizations willing to pay for enterprise features. Enterprise target addressable market: 5,000-20,000 potential paying organizations, weighted toward smaller teams in the near term.

**Serviceable Obtainable Market (SOM, Year 1-2):** Realistically, in the first 12-24 months, a well-executed hook marketplace can reach 10,000-50,000 CLI installs from individual developers (no direct revenue), 50-200 hook authors paying for verified badges ($99-299/year each = $5,000-60,000 ARR), and 5-20 paying team/enterprise accounts ($299-2,000/month each = $18,000-480,000 ARR). The realistic Year 2 exit MRR target is $5,000-10,000, scaling to $100k MRR in Year 3-4 if Claude Code reaches several million active users.

These numbers are honest. A hook marketplace is not a $10M ARR year-one business. It is an infrastructure play with a 3-4 year path to meaningful revenue, contingent on Claude Code platform growth that is not yet guaranteed.

---

## 5. Why Now

### The Copy-Paste Phase Always Precedes the Marketplace

The community is in the exact phase that historically precedes a marketplace in every developer tool ecosystem. The pattern:

1. A platform adds an extension mechanism (hooks, in 2025).
2. Early adopters build useful things and share them informally — GitHub repos, HN posts, blog posts.
3. An awesome list emerges to aggregate the scattered resources.
4. Someone starts copying from the awesome list and wrapping hooks in npm packages.
5. A package manager for that specific format is built, wins distribution, and becomes the standard.

Claude Code hook development is in step 4 right now. `johnlindquist/claude-hooks` and `@constellos/claude-code-kit` are step-4 indicators — developers inventing packaging because the packaging they want doesn't exist. The Show HN post for `cc-hooks-ts` (type-safe hook builder with npm-installable components) received significant engagement precisely because it addresses the copy-paste distribution problem.

The transition from step 4 to step 5 — from "developers inventing packaging themselves" to "a standard package manager exists" — is where the window to establish the standard lies. Once a package manager exists and has install count history, switching costs are high enough that the format winner takes the distribution layer.

### Security Awareness Is Fresh

CVE-2025-59536 and CVE-2026-21852 were published in late 2025 and early 2026. The security community's awareness of the hook attack surface is fresh, which means:

- Enterprise security teams evaluating Claude Code are asking about hook safety right now, before any standard exists.
- A marketplace that launches with a security-first posture can fill the vacuum immediately and earn enterprise trust before any incident occurs.
- The window for being "the secure hook registry" rather than "the hook registry that had the incident" is open now and will close after the first supply-chain attack through shared hooks — which is a matter of when, not if, given the current state.

### Anthropic Is Expanding Fast but Not Building This

Anthropic published the `plugin-marketplaces` protocol, which specifies how third parties should build hook and plugin marketplaces. They published example code in `anthropics/claude-plugins-official`. They wrote documentation on how to create and distribute a marketplace. They have not built a curated hook registry. Their track record is consistent: build the protocol, leave the ecosystem to third parties.

The VS Code parallel is useful here. Microsoft built the extension API in 2015 and the basic marketplace infrastructure. They did not build GitLens (15M+ installs), Prettier's VS Code integration (50M+ installs), or ESLint's VS Code integration (30M+ installs). Third parties built those, and the third parties that got there early and got the install count flywheel running still dominate. Anthropic's posture toward hooks suggests the same dynamic.

### The Timing Constraint Is Real

The analogous moment for VS Code extensions was 2016-2017: the editor had millions of users, the extension API was stable, but the marketplace was thin and there was no established quality leader. That window lasted roughly 18 months before dominant extensions captured the space.

A hook marketplace has a similar window. The difference: Claude Code's user base is smaller than VS Code's was in 2016, which extends the window somewhat — there is less urgency from competition — but it also means the early revenue numbers will be modest. The argument for acting now is not "the market is big today." It is "build the distribution standard before the market is big, because the distribution standard winner at small scale is the winner at large scale."

---

## 6. The Moat

What makes this defensible 18 months after launch?

### First-Mover Catalog Advantage

The registry that exists is the one people use. This is not a tautology — it is the observed behavior of every successful package registry. npm had 6,000 packages in 2011; by 2012 it was the assumed destination for Node.js modules, and the question "why not PyPI or RubyGems?" was never seriously asked for Node packages again. VS Code Marketplace became the assumed destination for VS Code extensions before any meaningful competition could form.

Install counts are the key data asset. Every installation that happens through your registry is a data point that makes the registry more useful for the next user. An install count of 10,000 on `bash-guard` is a quality signal that no new entrant can replicate without running their own install campaign. The install history is irreplaceable by definition — it cannot be manufactured retroactively. Being first with a working CLI means your install counts are permanently ahead of any later entrant.

### Security Verification Infrastructure

Building a rigorous security review pipeline — automated static analysis, human review for the verified badge, cryptographic signing, capability declaration format — is expensive to build and takes time to make credible. The infrastructure itself is not the moat; the trust in the infrastructure is. Enterprise buyers need 6-12 months of seeing no incidents before they trust a verification badge enough to use it in procurement decisions.

A marketplace that launches with security-first infrastructure and accumulates a clean track record over 18 months has a moat that a later entrant cannot close quickly. The later entrant can build the same technical infrastructure in 3 months. They cannot manufacture 18 months of incident-free operation in the same timeframe.

### Community Trust as a Neutral Registry

The VS Code extension marketplace is owned by Microsoft, which creates tension with the open source community — visible in the Eclipse Foundation's decision to create Open VSX as a vendor-neutral alternative. npm is owned by GitHub (Microsoft), which has generated ongoing debates about the long-term governance of critical open source infrastructure.

A hook marketplace that is explicitly open source, community-governed, and not owned by Anthropic occupies a trust position that neither Anthropic (if they built one) nor a VC-backed competitor (if they raised money and built one) can easily replicate. The governance model is a moat specifically because it cannot be copied without the underlying institutional structure.

This is not a naive claim about open source winning on purity. It is a specific claim about enterprise procurement: "we are not Anthropic, we are a neutral registry that works with Claude Code" is a procurement story that survives the question "what happens if Anthropic changes their pricing or deprecates hooks?" in a way that Anthropic's own registry cannot.

### Network Effects: More Hooks → More Users → More Contributors → More Hooks

Once the registry has 100-200 hooks with install history, the flywheel operates: more hooks increases the probability that a given developer finds something useful, which drives more CLI installs, which drives more individual developers to submit their hooks, which increases the hook count. This flywheel is the same one that made npm and the VS Code Marketplace dominant in their respective ecosystems.

The flywheel is fragile until it's not: it takes 6-12 months of consistent execution to get enough hooks and enough install history that the network effect compounds automatically. The founding team's job for that period is to manually seed the catalog (Tier 1 universal hooks that every developer wants), execute the contribution strategy (outreach to existing hook repo authors, GitHub issue bounties, HN posts at milestones), and not break trust with any security incident.

---

## 7. Risks (Honest Assessment)

### Platform Dependency on Anthropic

Every hook in the registry is defined against Anthropic's hook API. Event names, JSON schemas, exit code semantics — all of it is Anthropic's design. If Anthropic changes the hook schema, every hook in the registry potentially breaks, and the marketplace operator bears the cost of migration tooling with no control over the upstream.

The mitigation is that Anthropic has strong incentives to maintain compatibility — the developer ecosystem that hooks represent is a competitive advantage, and breaking it would damage their enterprise positioning. The hook API has been stable since mid-2025. The risk is real but not acute.

### Anthropic Builds a Competing Official Marketplace

This is the existential scenario. Anthropic decides hooks are important enough to curate officially and launches `claude.ai/hooks` with first-party installation tooling and Anthropic's credibility behind the verification badge.

The evidence against this happening soon: Anthropic's pattern is to build protocols and leave the marketplace layer to third parties. `anthropics/claude-plugins-official` is example code, not a product. The `plugin-marketplaces` documentation is a spec, not a proprietary API. Anthropic is focused on the core model and product, not ecosystem tooling. The Claude Code team has explicitly left the marketplace layer open.

The probability is low in the 18-month window and moderate in the 3-5 year window. The mitigation: build network effects and community trust fast enough that Anthropic building a competing marketplace looks like a harmful move to their own ecosystem rather than a supportive one. The npm parallel applies — the JavaScript community would revolt if GitHub tried to deprecate npm in favor of a proprietary registry.

### Security Liability

If a hook distributed through your marketplace causes RCE or credential exfiltration on a user's machine, the reputational damage is potentially fatal and the legal exposure is real. The verified badge creates an implied warranty problem: if you charge for verification and a verified hook is malicious, you are exposed.

This risk is the reason that security infrastructure must precede marketing and scale. A marketplace with strong security review processes and a clear track record is in a different legal and reputational position than one that trades on the word "verified" without the underlying rigor. The ToS must clearly characterize the registry as an index service (not a sandbox or executor), the "Verified" badge description must clearly state what was reviewed and what was not, and cyber liability insurance is worth exploring before the marketplace reaches significant traffic.

### The Platform Bet

The $100k MRR scenario requires Claude Code to reach several million active users. That trajectory is not guaranteed. If competition from Cursor, GitHub Copilot, Gemini Code, or a new entrant slows Claude Code's growth, the ceiling of the marketplace is lower than modeled. This is a platform bet, not a distribution bet — the marketplace succeeds or fails based in part on a platform it does not control.

The appropriate response to this risk is to build the marketplace as a well-capitalized open-source project rather than a venture-scale business requiring aggressive growth. The infrastructure investment required to launch a credible registry is modest (a working CLI, a GitHub-backed registry, 10-50 well-authored hooks). The risk of over-investing based on a large-platform assumption is greater than the risk of under-investing.

---

## Conclusion

The opportunity is real, the timing is right, and the gap is undeniable. No player has a meaningful head start on a hook-specific distribution layer. The risks are real — platform dependency, Anthropic competition risk, security liability — and manageable with the right sequencing.

The critical sequencing condition is the one that runs counter to standard startup instinct: build the security infrastructure before you build for scale. The CVE findings are specific enough, and the hook attack surface is exposed enough, that a marketplace that enables rapid distribution of unverified hooks is not just risky — it will eventually produce the incident that poisons the entire category. The marketplace that ships with a rigorous security model, accumulates a clean track record, and earns enterprise trust over 18 months is the one that owns the distribution layer when Claude Code reaches the scale that makes the revenue numbers interesting.

The alternative — waiting for Anthropic to build it — is not a credible option. Anthropic has consistently left this layer to the community. The window exists precisely because they have.

---

## Appendix: Key Sources

- Research on existing ecosystem: `ws-existing.md` — competitive landscape, gap analysis, all repos cited
- Research on community usage: `ws-community.md` — use cases, HN threads, CVE details, pain points
- Research on marketplace models: `ws-marketplace-models.md` — VS Code, GitHub Actions, npm, JetBrains, Figma, Zapier comparables
- Research synthesis and build recommendation: `hook-marketplace-research.md` — sections 3 and 4 (competitive landscape and opportunity assessment)
- Primary CVE source: Check Point Research, "RCE and API Token Exfiltration Through Claude Code Project Files (CVE-2025-59536, CVE-2026-21852)"
- Community hub referenced: `hesreallyhim/awesome-claude-code` (21.6k stars, January 2026)
- Closest functional marketplace: `claudeforge/marketplace` (161 plugins, CLI install, hooks as secondary feature)
- TypeScript hook framework reference: `johnlindquist/claude-hooks` (typed, npm-installable, async/await)
