# Competition Overview

**Audience:** Founder deciding whether to build; early employees evaluating the opportunity.
**Verdict upfront:** No meaningful competitor exists in the hook-specific layer. The threat is not who is ahead of you — it is whether the market materializes fast enough and whether Anthropic decides to own it themselves.

---

## The Honest Competitive Map

The landscape divides cleanly into three groups. None of them is doing what a hook-first marketplace does.

### Group 1: Hook-Adjacent — Broad Plugin Marketplaces That Include Hooks

These are the closest things to a competitor in user-facing framing. They are not close in execution.

#### `claudeforge/marketplace`

**What it does:** A GitHub repo that catalogs Claude Code plugins across multiple types — MCPs, commands, settings presets, and hooks as one component among several. Claims 161 plugins. Has a basic CLI install path using copy-paste commands.

**What it doesn't do:** Hooks are not the primary entity. There is no hook-specific search, no event-type filtering (`PreToolUse`, `PostToolUse`, `SessionStart`), no capability declarations, no security review layer, no signing, no versioning for individual hooks. Installing a hook still requires manual `settings.json` editing.

**Activity:** Moderate. Active GitHub commits but no clear product direction toward hook-specific tooling.

**Threat level: Low.** Breadth is its weakness here. A hook-first marketplace wins on depth and specificity — the developer who wants a bash-guard hook does not want to browse through MCP servers to find it. claudeforge's generalism is a structural disadvantage against a focused competitor.

---

#### `hyperskill/claude-code-marketplace`

**What it does:** Similar to claudeforge — a GitHub-backed catalog of Claude Code extensions including hooks. Narrower catalog, less active.

**What it doesn't do:** No hook-specific UX, no security model, no CLI package manager, no versioning.

**Activity:** Low. Intermittent commits. Not a project with momentum.

**Threat level: Low.** Not a serious threat unless someone with resources acquires and rebuilds it.

---

#### `claude-market/marketplace`

**What it does:** Another broad plugin catalog. Hooks appear as a listed type. No distinguishing feature from claudeforge.

**What it doesn't do:** Everything above — no hook-specific tooling, no install automation, no quality signal.

**Activity:** Low-to-moderate.

**Threat level: Low.**

---

#### `hesreallyhim/awesome-claude-code`

**What it does:** The de facto community hub. 21.6k stars, 1.2k forks (as of March 2026). Has a Hooks section that links to individual repos — karanb192, disler, johnlindquist, and others. This is where most developers currently discover hooks. Every major hook collection surfaces here.

**What it doesn't do:** This is a curated Markdown file, not a registry. It links to GitHub repos. There is no install tooling, no versioning, no ratings, no security model, no search beyond `Ctrl+F`. Discovering a hook and installing it are two completely separate operations requiring manual copy-paste.

**Activity:** Very high. One of the most active Claude Code community resources. Maintained by a single person (hesreallyhim) who has indicated interest in a proper installer but has not built one.

**Threat level: Medium.** Not because awesome-claude-code competes — it doesn't — but because it is the incumbent discovery layer. If you build a marketplace and it doesn't appear in awesome-claude-code, you are invisible to a large fraction of potential users. Conversely, if the maintainer builds a basic installer before you launch, that absorbs some of the discoverability value. Watch this repo closely. Getting listed here is a launch requirement.

---

### Group 2: Hook-Specific Repos — Collections Without Marketplace UX

These are the people actually doing the work of building hooks. They are not competitors; they are the supply side of your future marketplace. Understanding them matters for seeding your catalog.

#### `karanb192/claude-code-hooks`

**What it does:** The canonical copy-paste security hook library. Shell scripts for blocking `rm -rf`, protecting `.env`, guarding `.git/`. Referenced across community roundups as the standard starting point. This is where most developers go after reading the hook documentation for the first time.

**What it doesn't do:** No install tooling. No versioning. No manifest format. Sharing mechanism is: clone the repo, copy the script, manually add the JSON config to `settings.json`.

**Activity:** Active. Referenced across HN, DEV Community, and awesome-claude-code.

**Threat level: None — this is your first catalog candidate.** The right move is to reach out, credit their work, and help them publish to the registry with attribution. Competition framing is wrong here; aggregation is the strategy.

---

#### `disler/claude-code-hooks-mastery` and multi-agent observability repos

**What it does:** More sophisticated hook implementations. The multi-agent observability system (hooks POST lifecycle events to a Bun server → SQLite → WebSocket → Vue 3 dashboard) is technically the most advanced hook project currently public. Shows where serious teams are heading with hook infrastructure.

**What it doesn't do:** Not packaged for sharing. Not documented for general use. No manifest format.

**Activity:** Active as of March 2026. New projects appearing from this author.

**Threat level: None directly.** Again, a catalog candidate. The observability hook is a Tier-2 target for the registry — sophisticated enough to signal serious ecosystem depth when listed.

---

#### `johnlindquist/claude-hooks`

**What it does:** TypeScript-first hook authoring framework. npm-installable. Strongly typed payloads, async/await, designed for developers who find shell-scripting fragile. Has the most sophisticated technical foundation of any hook project.

**What it doesn't do:** It is a framework for writing hooks, not a registry for distributing them. No discovery layer, no search, no install manager for end users.

**Activity:** Active. TypeScript wrapper adoption is an indicator of demand for a packaging model — developers who build npm-compatible hooks are one step away from wanting a registry to publish them to.

**Threat level: Low-Medium.** This is the most important technical relationship to manage. johnlindquist could pivot from "framework for writing hooks" to "framework plus registry" and have a strong technical foundation. Monitor. The better move is to make `johnlindquist/claude-hooks` the TypeScript SDK for your registry — not a competitor.

---

### Group 3: Potential Future Competitors

These don't exist yet but are the threats worth modeling.

#### Anthropic — Official Hook Registry

Anthropic has built the hook schema, the `plugin-marketplaces` protocol (`marketplace.json`), and `anthropics/claude-plugins-official`. Their `claude-plugins-official` repo contains example code, not a curated registry. The `plugin-marketplaces` documentation is explicit: Anthropic built the protocol and left marketplace operation to third parties. This is their pattern with the broader Claude Code ecosystem — ship the API, let the community build the ecosystem.

**Threat level: High if it materializes, but unlikely in year one.** Covered in depth in the Anthropic section below.

---

#### VS Code Extension Model Applied to Claude Code

VS Code's extension marketplace works because Microsoft owns the editor and the distribution channel. A third party who applies the VS Code model to Claude Code would face the same structural position as any other marketplace operator — dependent on Anthropic's API, no privileged access to the Claude Code settings file, no first-party endorsement. No one is currently doing this seriously.

**Threat level: Low.** The structural advantage that makes VS Code Marketplace defensible (Microsoft controls both) does not apply to a Claude Code hook marketplace built by anyone other than Anthropic.

---

#### npm Packages for Hooks

`@constellos/claude-code-kit`, `claude-code-templates`, and `claude-flow` (IPFS-based) represent attempts to use npm as a distribution channel for hooks. The technical problem: npm installs code; hooks install behaviors into `settings.json`. A hook delivered as an npm package still requires the user to manually configure `settings.json` after install, which eliminates the core UX improvement. The npm approach also doesn't solve discoverability — searching npm for hooks is no better than searching GitHub.

**Threat level: Low.** The mismatch between npm's mental model (install a library, import it) and hook installation (write a JSON block into a config file) limits how far the npm approach can go without a dedicated layer on top — which is what a hook marketplace is.

---

## The Gap Table

What a hook-first marketplace provides that nothing currently does. "Partial" means the feature exists in some form but with significant limitations.

| Capability | Hook Marketplace | awesome-claude-code | claudeforge | Anthropic Official |
|---|---|---|---|---|
| One-command install: `hookpm install bash-guard` | Yes | No | Partial (manual JSON still required) | No |
| Hook-specific search (by event type, use case, language) | Yes | No | No | No |
| Automated static analysis before listing | Yes | No | No | No |
| Human security review with verified badge | Yes | No | No | No |
| Cryptographic signing and install-time verification | Yes | No | No | No |
| Versioned hooks with semver | Yes | No | No | No |
| Update notifications: `hookpm update` | Yes | No | No | No |
| Capability declarations (network, filesystem, subprocess) | Yes | No | No | No |
| Install count and community ratings | Yes | No | No | No |
| Lockfile for reproducible hook environments | Yes | No | No | No |
| Scoping metadata (per-project vs global) | Yes | No | No | No |
| Composable pipeline metadata | Yes | No | No | No |
| Enterprise private registry with SSO | Yes | No | No | No |
| Audit logs: who installed which hook, when | Yes | No | No | No |
| Air-gapped mirror for regulated environments | Yes | No | No | No |
| Org-level policy enforcement (allowlist/denylist) | Yes | No | No | No |
| Hook author namespace and publishing workflow | Yes | No | Partial | No |
| Dedicated per-hook landing pages for SEO | Yes | No | No | No |

The gap is not incremental. This is the equivalent of 2005 — packages exist, they are shared by copying URLs, and npm does not yet exist. Every row in this table is zero work done by any existing player.

---

## The Anthropic Question

Anthropic is the only entity that could make this marketplace irrelevant overnight. Their four possible postures, with honest probability assessments.

### Scenario 1: They Ignore It (Most Likely — ~55% probability)

Anthropic neither promotes nor inhibits a third-party hook marketplace. The marketplace grows or doesn't based on its own merits. Anthropic continues providing the hook API and example code (`anthropics/claude-plugins-official`) and leaves ecosystem tooling to the community.

**Evidence for this scenario:** This is exactly what happened with `hesreallyhim/awesome-claude-code` (21.6k stars, built by the community, no Anthropic involvement), with `claudeforge`, with `hyperskill`, and with the `disler` observability suite. Anthropic's pattern is consistent: ship the API, document it, let the ecosystem develop. They have not moved to build community tooling for any of these.

**How to respond:** Build without waiting for a signal. Treat Anthropic's silence as implicit permission — they built the `plugin-marketplaces` protocol and published it. The marketplace is filling a gap they deliberately left open. Notify the Claude Code team proactively when you launch (not to ask permission, but to avoid being a surprise). Being a known entity is better than being unknown.

**Risk in this scenario:** No Anthropic validation signal creates friction with enterprise buyers who want to know if this is "official." Mitigation: build legitimacy through security rigor, community reputation, and professional documentation — not through claimed Anthropic affiliation.

---

### Scenario 2: They Endorse and Link to It (Best Case — ~25% probability)

Anthropic publishes a blog post or documentation reference pointing to the marketplace as the recommended way to find community hooks. Adds a link in the Claude Code docs. This is the outcome that accelerates adoption by 12-18 months.

**Evidence for this scenario:** Anthropic has explicitly built the `plugin-marketplaces` protocol to enable third-party marketplaces. This is a structural invitation. If a hook marketplace becomes the clearly dominant discovery and distribution layer, it becomes rational for Anthropic to acknowledge it in documentation — it makes Claude Code look more mature and extensible. VS Code's extension marketplace got its initial traction partly because Microsoft actively promoted it in docs and release notes.

**How to optimize for this:** Build something Anthropic would not be embarrassed to link to. Specifically: professional security model, clear "this is a community project, not affiliated with Anthropic" labeling, rigorous quality standards, and proactive outreach to the Claude Code team. Do not claim Anthropic endorsement before you have it. Do not build anything that looks like it's trying to hijack Anthropic's brand.

**What this does to the business:** Validation from Anthropic is the equivalent of a VS Code Marketplace featured listing — it converts organic discovery into a structured growth event. Plan for this as an asymmetric upside, not a baseline assumption.

---

### Scenario 3: They Build Their Own (Competitive Threat — ~15% probability)

Anthropic builds `claude.ai/hooks` or integrates a first-party hook marketplace into the Claude Code product. This would have privileged access to the settings file, a built-in install button in the Claude Code UI, and first-party discovery from the main product surface.

**Evidence against this scenario:** Anthropic has consistently not built ecosystem tooling. `anthropics/claude-plugins-official` is example code, not a product. Building a hook marketplace requires product management, curation, ongoing security review, and community management — none of which are in Anthropic's demonstrated priority set. They have a core product to build and competitive pressure from OpenAI, Google, and others on the model and product layers.

**Evidence for this scenario:** If the hook ecosystem becomes large enough to matter for Claude Code's enterprise sales (i.e., enterprise customers start asking "how do we safely distribute hooks to our developers?"), Anthropic will face internal pressure to own this layer. Enterprise security requirements create specific demand for a first-party, audited distribution channel that a third-party marketplace cannot fully satisfy.

**How to respond if this happens:** The window to build defensibility is 12-18 months. The moats that survive an Anthropic-built marketplace: community trust established before the official launch (developers are conservative about switching; if hookpm works, they don't switch), hook author relationships (authors published here first), and enterprise private registry features that Anthropic is unlikely to prioritize (air-gap support, SSO, audit logs, fine-grained policy enforcement). An official Anthropic marketplace would likely be public-registry only — the enterprise layer remains available to a third party. Pivot the business to the enterprise layer if Anthropic captures the public layer.

---

### Scenario 4: They Change the Hooks API in a Breaking Way (Platform Risk — ~5% probability)

Anthropic renames hook events, changes the JSON schema, or adds restrictive settings like `allowManagedHooksOnly` that limit what third-party hooks can do. Every hook in the registry potentially breaks.

**Evidence against:** The hook API has been stable since mid-2025. Anthropic has strong developer ecosystem incentives to maintain compatibility — breaking changes destroy the community trust they have built. The `allowManagedHooksOnly` scenario would require Anthropic to actively harm their developer ecosystem, which contradicts their public positioning.

**Evidence for:** Anthropic has no public commitment to API stability for hooks. If a security incident (RCE via a malicious hook) gets attributed to Claude Code, Anthropic may respond with restrictions that break the ecosystem. The CVE findings (CVE-2025-59536, CVE-2026-21852) demonstrate that this attack surface is real and known.

**How to respond:** Monitor the hooks API changelog obsessively. Build migration tooling into the CLI from day one — when a hook's schema assumptions change, `hookpm` should be able to report what broke and what to do about it. The marketplace that handles API changes gracefully becomes more valuable after a breaking change, not less. Also: building and shipping the security model before launch reduces the probability of the security-incident trigger for restrictive API changes.

---

## The Defensibility Argument

What makes a hook marketplace hard to copy once it is established. This is what you are actually building — the catalog and the CLI are just the means.

### Registry Network Effects — The Data Moat

Install counts, ratings, and usage telemetry are irreplaceable. A hook with 4,000 installs and a 4.8-star rating is a different product than the same code with zero installs. Late entrants start with no historical data. This is the same moat npm has — the historical install data is not something a fork can replicate. The moat builds from day one: every install of every hook is data that a competitor starting six months later cannot have.

The practical implication: build install telemetry into the CLI from day one, even if the initial counts are small. The infrastructure matters more than the numbers early on.

### Security Verification Infrastructure and Reputation

Building a rigorous security review pipeline — static analysis, human review, capability declarations, cryptographic signing — is expensive and takes time to make credible. More importantly, reputation for security review is earned through incident-free operation over time, not purchased. Once enterprises trust the verified badge, they will not switch to an unverified alternative without a compelling reason. This moat is expensive to build but compounds over years: a marketplace with three years of clean security review history is qualitatively different from one that launched last month.

The CVE findings make this moat structural, not optional. Any competitor that tries to grow fast by skipping security review will eventually have an incident. When they do, the verified alternative becomes the obvious destination.

### Community Trust — The Neutral Party Advantage

The marketplace's value depends on being a neutral aggregator, not a party with conflicting interests. This is why npm's neutrality matters: it doesn't compete with the packages it hosts. Anthropic cannot be fully neutral (they have a product to sell). claudeforge has its own plugin priorities. An independent, community-focused marketplace that publishes everything, reviews rigorously, and never favors its own hooks builds a different kind of trust than a corporate-backed alternative. This is especially important for the hook author community: authors will publish to the registry they trust to treat their work fairly.

The OSS governance model (public registry spec, open CLI code) is not just idealism — it is the structural signal that establishes neutrality. Authors who contribute to an open standard are building something larger than any single company's registry.

### Hook Author Relationships

The supply side of the marketplace — hook authors — is a concentrated community. There are probably 50-100 serious hook authors as of March 2026. Being the platform these authors publish to first, and treating them well (attribution, namespace control, earnings from verification if you build a paid author tier), creates switching costs that are partly social and partly practical. An author who has published 20 hooks to your registry, built a following, and integrated your CLI into their workflow does not casually move to a competitor. First-mover relationships with the top 20 hook authors are a significant competitive asset.

### First-Mover SEO and Discoverability

Search traffic for hook-related queries is currently unowned. "Claude Code bash safety hook," "Claude Code auto-format hook," "Claude Code hooks security" — these queries have no clear authoritative result. Every hook in the registry generates a dedicated landing page that can rank for these terms. Being first to build a catalog of 500+ hooks means owning 500+ pages of organic search traffic before any competitor starts. SEO moats in developer tooling are real and durable — once `hookpm.dev/hooks/bash-guard` ranks first for its query, displacing it requires both building a comparable page and waiting for Google to re-evaluate.

---

## How to Win Against Each Threat

Generic "build a better product" advice is not useful. Here is the specific strategy per competitor type.

### Against Awesome-Claude-Code (the incumbent discovery layer)

Do not compete with it — integrate with it. The goal in the first 90 days is to be listed in awesome-claude-code's Hooks section prominently, with the `hookpm install` command shown next to every hook it links to. Contact hesreallyhim directly before launch. Offer to provide the install command format they could include in their listings. Position hookpm as the "how to install" layer for awesome-claude-code's "what exists" layer. If this relationship is managed well, awesome-claude-code becomes a referral source, not a competitor.

The risk: hesreallyhim builds a basic installer before you launch. Counter: move fast, and make your installer substantially better (automatic `settings.json` modification, versioning, security warnings) rather than marginally better. A basic installer that still requires manual JSON editing is not the same product.

### Against claudeforge and Other Broad Marketplaces

Win on specificity. These players compete on breadth (MCPs, commands, hooks, templates, all in one place). A hook-first marketplace wins by being the authoritative source for hooks specifically — better search, better documentation, better security review, better hook-specific metadata (event types, matchers, capability declarations). A developer searching for a `PreToolUse` security hook does not want to browse a general plugin directory; they want to run `hookpm search security --event PreToolUse`.

The tactical move: make hook-specific metadata (event type, trigger, capability declarations) a first-class filter in every search interface. claudeforge cannot easily add this without rebuilding their schema around hooks — and hooks are not their primary focus.

### Against Individual Hook Repos (karanb192, disler, johnlindquist)

Do not compete — aggregate. Contact these authors early, before launch. The pitch: "We want to list your hook in the registry with full attribution and a link back to your repo. We'll handle discoverability and installation; you maintain the code." This is a genuine value exchange. These authors built hooks for their own use and shared them publicly — they have no infrastructure for distribution. You provide distribution; they provide supply.

The specific play for `johnlindquist/claude-hooks`: position their TypeScript framework as the official TypeScript SDK for the registry. Make TypeScript hooks first-class citizens alongside shell scripts. If the TypeScript hook format becomes the standard for the registry, johnlindquist benefits from driving standards work and you get the most sophisticated hook authors using your registry.

### Against npm-Based Distribution

npm-based hook distribution fails at the configuration step — the user still has to manually edit `settings.json`. The counter-strategy: make `hookpm install` so much better than `npm install + manual JSON editing` that the npm approach looks like a workaround. The key differentiator is the `settings.json` manipulation: hookpm handles it correctly for all edge cases (file doesn't exist, existing hooks for other events, merge without duplicating). This is the technical moat that matters most in the first six months — it is not glamorous, but it is the specific thing npm cannot do without a dedicated layer.

### Against an Anthropic-Built Official Marketplace

If Anthropic announces an official hook registry, the window for a strategic response is roughly six months before it captures all attention. The correct pivot: double down on the enterprise private registry layer. Anthropic's official registry will be a public-facing, community product. It will not have SSO, audit logs, air-gap support, or fine-grained policy enforcement in its first version — these are enterprise features that require sales engineering and compliance work that Anthropic is not prioritizing. The enterprise layer is a separate business that can coexist with an official public registry. Position immediately as "the enterprise-grade layer built on top of Anthropic's official hooks ecosystem."

The secondary response: move from a registry model to a services model. Security review and consulting for enterprises that need hook assessments. CI integration for teams that want automated hook validation in their pipelines. These are defensible regardless of what Anthropic builds in the public layer.

---

*Last updated: March 2026. Competitive positions are based on GitHub activity, community signals, and stated product directions. All star counts and activity levels should be reverified at the time of launch.*
