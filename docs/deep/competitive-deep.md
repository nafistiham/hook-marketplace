# Competitive Deep Dive — Hook Marketplace

**Date:** 2026-03-10
**Sources:** ws-existing.md, ws-marketplace-models.md, hook-marketplace-research.md (sections 3, 4)

---

## The Landscape in One Sentence

No hook-first marketplace exists. Multiple adjacent things do — link directories, broad plugin repos, and dedicated code libraries — but none of them solve the distribution, security, or discoverability problem that a hook marketplace solves.

---

## Full Teardown: Every Existing Player

### 1. `hesreallyhim/awesome-claude-code`
**Stars:** 21.6k | **Forks:** 1.2k | **Last updated:** January 2026

**What it is:** The dominant community resource for all Claude Code tooling — hooks, agents, skills, slash commands, MCP configs. Has a dedicated Hooks section. Maintained by hand via PRs from the community.

**What it does well:**
- Best discoverability of anything in the ecosystem
- Trusted by the community — star count is a genuine signal
- Covers the breadth of what people are building
- Active curation keeps quality reasonable

**What it fundamentally cannot do:**
- No one-command install — every hook is a copy-paste or manual clone
- No versioning — if a hook author updates their code, you'll never know
- No security review — any PR can add a link to a malicious repo
- No search by event type, category, or capability
- No ratings or install counts
- Not a registry — it's a Markdown file with GitHub links

**Threat level: Medium.** This is the incumbent discoverability layer. People who want to find hooks go here first. A hook marketplace needs to get into the Hooks section of this list as early as possible — not compete with it. The goal is to be the thing awesome-claude-code links to for installable hooks.

**Weakness to exploit:** It cannot install anything. The moment `hookpm install block-dangerous-commands` is faster than copy-pasting from GitHub, developers stop going to the list first. Speed of adoption is the wedge.

---

### 2. `claudeforge/marketplace`
**Stars:** ~400 | **Plugins:** 161 | **Install UX:** CLI commands

**What it is:** A GitHub-based Claude Code plugin marketplace. Hooks appear as plugin components alongside agents, skills, and commands. Has the most developed install UX of any existing player — documented CLI commands for installation.

**What it does well:**
- Most developed install story of any existing player
- 161 plugins suggests real contributor activity
- Follows the official Claude Code plugin schema

**What it fundamentally cannot do:**
- Hooks are a secondary feature, not the primary interface
- No hook-specific search, filtering, or taxonomy
- No security review for any plugin type
- No versioning or update notifications
- No signed hooks, no capability declarations

**Threat level: Low-Medium.** This is the closest thing to a real marketplace, but it's not hook-first and has no security model. Risk: if it grows significantly and adds hook-specific features, it could become harder to displace. Current trajectory suggests it's a side project, not a committed product.

**Weakness to exploit:** It treats hooks the same as agents and commands — one schema for everything. A hook marketplace that deeply understands hook-specific semantics (event types, matchers, handler types, security implications) will build a far superior UX. The hook category deserves its own home, not a row in a plugin table.

---

### 3. `claude-market/marketplace`
**Stars:** ~150 | **Format:** Open source, hand-curated

**What it is:** An open source, hand-curated marketplace for Claude Code tools — agents, skills, hooks. Defines a plugin schema for submissions.

**What it does well:**
- Open source approach builds community trust
- Plugin schema is a step toward standardization
- Low barrier to contribution

**What it fundamentally cannot do:**
- Hooks are one of several item types — not first-class
- No security model
- No install tooling
- Activity level unclear

**Threat level: Low.** Small community, no standout feature. More likely a potential ally (link to hookpm) than a competitor.

---

### 4. `hyperskill/claude-code-marketplace`
**Stars:** ~100 | **Format:** Central registry, follows official plugin schema

**What it is:** A registry that follows Anthropic's official plugin schema. Includes hooks, commands, skills, subagents.

**What it does well:**
- Schema-compliant — compatible with how Anthropic defines plugins
- Centralized registry approach

**What it fundamentally cannot do:**
- No hook-specific features
- No security review
- No meaningful install tooling discovered

**Threat level: Low.** Schema compliance is a feature but not a moat. The value is in the catalog and the install UX, not the schema.

---

### 5. `karanb192/claude-code-hooks`
**Stars:** ~300 | **Format:** Copy-paste code library

**What it is:** A growing collection of hooks focused on safety, automation, and notifications. Described as "Copy, paste, customize." Hooks-only focus — the only dedicated hook collection found.

**What it does well:**
- Hooks-only focus — highest signal-to-noise for hooks specifically
- Real, tested implementations
- Active development
- Good reference implementations for security hooks

**What it fundamentally cannot do:**
- No install UX — purely copy-paste
- No versioning
- No discoverability beyond GitHub search
- No security review (ironically, given its safety focus)

**Threat level: Low — and a major supply-side opportunity.** This author is building exactly the hooks a marketplace needs. The right move: reach out early, offer to be the distribution layer for their hooks, potentially offer free certification as an early adopter benefit. Turn a potential fork into a founding contributor.

---

### 6. `johnlindquist/claude-hooks`
**Stars:** ~200 | **Format:** TypeScript framework, npm package

**What it is:** A TypeScript-first hook authoring framework. Published to npm. Provides strongly-typed payloads, async/await support, and a developer-friendly API for writing hooks.

**What it does well:**
- TypeScript types for all hook event payloads — eliminates a class of bugs
- npm distribution — the right instinct for hook sharing
- Actually installable (`npm install johnlindquist/claude-hooks`)

**What it fundamentally cannot do:**
- It's a framework for writing hooks, not a registry of hooks
- Doesn't solve discoverability
- No security model
- Hooks still need to be wired into `settings.json` manually

**Threat level: Low — and a technical ally.** The TypeScript typed payload system is exactly what a hook authoring SDK should have. Rather than competing, `hookpm` should:
1. Build on or cite this type system for the official `hookpm` TypeScript SDK
2. Make hooks written with `johnlindquist/claude-hooks` first-class citizens in the registry
3. Treat the author as a potential early contributor/advisor

---

### 7. `disler/claude-code-hooks-mastery` + `disler/claude-code-hooks-multi-agent-observability`
**Stars:** ~400 combined | **Format:** Tutorial repos + reference implementations

**What it is:** Two repos from the same author — one covering all 13 hook event types with TTS, security, and automated testing; the other implementing a full real-time multi-agent observability dashboard via hooks.

**What it does well:**
- Best demonstration of advanced hook capabilities in the ecosystem
- The observability dashboard is the most sophisticated hook implementation found
- Regularly cited as reference material

**What it fundamentally cannot do:**
- Not a marketplace or registry
- No install UX
- Purpose is education and demonstration, not distribution

**Threat level: Low — strong supply-side candidate.** The observability dashboard hook is exactly the kind of Tier-2 hook a marketplace should carry. The author is clearly advanced. Early outreach could turn this into a showcase submission.

---

### 8. `anthropics/claude-plugins-official`
**Stars:** ~500 | **Format:** Official Anthropic plugin directory

**What it is:** Anthropic's own plugin directory. Provides a reference implementation showing the hook component format within the broader plugin schema. Defines the official schema that all plugin marketplaces follow.

**What it does well:**
- Sets the canonical schema — everything else in the ecosystem follows this
- Has Anthropic's credibility
- Reference implementation is useful for hook authors

**What it fundamentally cannot do:**
- No curated hook library — only schema and examples
- No install tooling for hooks specifically
- No security review beyond Anthropic's own submissions
- Not intended to be a consumer-facing marketplace

**Threat level: Medium-term.** Anthropic owns the schema. If they decide to build a real marketplace on top of it, they have the authority and trust to do so quickly. See the Anthropic threat scenarios below.

---

## The Gap Table

What a hook-first marketplace provides that nothing currently does:

| Capability | hookpm marketplace | awesome-claude-code | claudeforge | karanb192 | anthropics/official |
|---|---|---|---|---|---|
| One-command install | ✅ | ❌ | Partial | ❌ | ❌ |
| Hook-specific search | ✅ | ❌ | ❌ | ❌ | ❌ |
| Filter by event type | ✅ | ❌ | ❌ | ❌ | ❌ |
| Versioning + lockfile | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update notifications | ✅ | ❌ | ❌ | ❌ | ❌ |
| Security review | ✅ | ❌ | ❌ | ❌ | ❌ |
| Signed hooks | ✅ | ❌ | ❌ | ❌ | ❌ |
| Capability declarations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Install count / ratings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Certification badge | ✅ | ❌ | ❌ | ❌ | ❌ |
| Private org registry | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Auto `settings.json` merge | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hook-only focus | ✅ | ❌ | ❌ | ✅ | ❌ |
| Active maintenance SLA | ✅ | Community | Community | Solo | Anthropic |

---

## The Anthropic Threat — Full Analysis

This is the most important competitive risk. Anthropic controls the platform, the schema, and the trust. If they decide to build a curated hook registry, they can do it faster and with more authority than any third party.

### Historical Pattern

Anthropic's consistent behavior with ecosystem tooling:
- They built the MCP **protocol and spec** — they did not build the MCP server marketplace (that's `mcpcat.io`, `docker.com/mcp-toolkit`, etc.)
- They built the plugin **schema** — they did not build a plugin marketplace
- They built the hooks **API** — they have not built a hook registry
- They built the Claude Code **SDK** — they did not build a package manager for SDK-based tools

The pattern is: Anthropic builds protocols and primitives, the ecosystem builds the distribution layer. This is deliberate — it's the same approach that made npm valuable for Node.js without Node.js Foundation building npm.

### Four Scenarios

**Scenario 1: They ignore it (probability: 55%)**

Anthropic continues to focus on the model and core platform. The hook marketplace grows without interference. A third-party registry becomes the de facto standard the same way npm became the de facto standard for Node packages.

*Response:* Build as fast as possible. Get catalog size and community trust to the point where an official alternative would face an installed base problem.

**Scenario 2: They officially endorse and link to it (probability: 20%)**

Anthropic adds a "Find hooks at hookpm.dev" link in their documentation. This dramatically accelerates discovery and gives implicit credibility.

*Response:* Cultivate the Anthropic Claude Code team relationship from day one. Be visible in their community channels. Maintain high quality standards. Make it easy for them to endorse without risk.

**Scenario 3: They build a competing official registry (probability: 15%)**

Most likely at Month 18–36 if the ecosystem proves large enough to justify. Anthropic builds an official registry that is schema-compliant, integrated into Claude Code's UI, and has their brand trust.

*Response:* Two survivable niches remain:
1. **The security/certification layer.** Anthropic is unlikely to build a rigorous third-party security audit system for community hooks. The certified/verified layer becomes the premium tier on top of Anthropic's official listing.
2. **The enterprise private registry.** Anthropic is a consumer AI company, not an enterprise SaaS company. Private registries, SSO integration, air-gapped mirrors, and audit logs are not their product motion. This is the entire Phase 3 revenue stream.

*The pivot:* "hookpm certification" becomes a trust signal that works WITH Anthropic's official registry, not against it. Enterprise orgs require hookpm-certified hooks before deploying, regardless of where they discover them.

**Scenario 4: Hostile API change (probability: 10%)**

Anthropic makes a breaking change to the hooks API that invalidates a significant portion of the catalog. Not likely to be malicious — more likely an unintended consequence of a major Claude Code version update.

*Response:* Maintain a compatibility matrix. React quickly. The advantage of a centralized registry is that one team can update all affected hooks faster than 1,000 individual authors. Make rapid response to API changes a feature, not just a risk.

---

## Analogous Market Histories

### npm (2010–present): The Registry That Won By Existing

npm launched in 2010 as a small package registry for Node.js. By 2015, it was the world's largest software registry. Key dynamics:

**How it won:** It existed when the ecosystem needed a registry. The registry that was there when developers needed to share code became the standard. No one evaluated npm against alternatives — there weren't any that mattered.

**What it got wrong:** Zero barriers to publish created massive quality and security problems. 82% of download demand comes from less than 1% of packages. The sustainability model — essentially volunteer labor and charity — is structurally broken. Two high-profile supply chain attacks (event-stream 2018, colors.js 2022) caused widespread damage and eroded trust.

**What to replicate:** Be first. Be reliable. Make publishing effortless.
**What to avoid:** Zero quality controls at publish time. No sustainability model. No security infrastructure until forced by incidents.

**Application to hook marketplace:** The npm lesson is about timing — the first serious registry wins. The lesson about quality controls is equally important: npm's lack of pre-publish review enabled the supply chain attacks that hook marketplaces will face faster (hooks run code with agent permissions, a much higher-risk surface than npm packages that must be explicitly invoked).

---

### VS Code Extension Marketplace (2016–present): The Platform-Owned Registry

Microsoft built the VS Code Extension Marketplace alongside VS Code. It now has 30M+ users and $25M+ paid to developers annually.

**How it won:** Deep in-tool integration. Extensions are discovered, installed, and updated from within VS Code. The marketplace IS the extension experience — there's no friction between discovery and use.

**What it got wrong:** Free expectations were set immediately and proved impossible to reverse. The paid extension model launched years later and has seen limited adoption. Open source community backlash against Microsoft's proprietary marketplace terms led to the Eclipse Foundation forking it as Open VSX.

**What to replicate:** CLI-first discoverability is the equivalent of in-tool integration for a terminal tool. `hookpm install` from within a session (or a CLAUDE.md that auto-installs hooks) is the hook marketplace's version of the VS Code sidebar.

**What to avoid:** Setting free-forever expectations for things you'll need to charge for later (certification, private registry). The VS Code marketplace had to fight uphill to introduce paid extensions because developers expected everything to be free.

**Application to hook marketplace:** Announce the certification pricing on day one, even before anyone is paying. Developers who join the ecosystem knowing certification costs $99/year will not feel betrayed when they're asked to pay — unlike VS Code extension authors who were promised a free platform.

---

### GitHub Actions Marketplace (2019–present): The Duplication Problem

GitHub Actions launched in 2018 with an accompanying marketplace for community-built actions. By 2025: 20,000+ actions, 6B+ workflow runs per month.

**How it won:** Embedded in the development workflow at the commit/PR level. Using an action requires no new tool — just a YAML file. Actions became mandatory infrastructure for CI/CD.

**What it got wrong:** A 2025 study (SecDev 2025) found 65% of new actions duplicate existing tools within six months of release. The marketplace has a massive signal-to-noise problem. Discoverability has degraded as the catalog has grown. GitHub's own "verified creator" badge exists but is not well-understood.

**What to replicate:** The embedded workflow integration model — hooks that install into a project's `.claude/settings.json` are the equivalent of actions defined in `.github/workflows/`. The install is the adoption event.

**What to avoid:** The duplication problem. GitHub Actions has thousands of actions that all "run tests" or "deploy to AWS" with minor variations. A hook marketplace needs curation — not just any hook that passes a syntax check, but a curated "Featured 50" as the default browse experience. Let the long tail exist, but surface the canonical implementations prominently.

---

## Positioning Matrix

```
                        HOOK-SPECIFIC
                              |
                              |
    karanb192/hooks           |         hookpm marketplace
    disler repos              |         (target position)
    johnlindquist/claude-hooks|
                              |
COLLECTION/DIRECTORY ─────────┼───────── TRUE MARKETPLACE
                              |
    awesome-claude-code       |         claudeforge/marketplace
                              |         claude-market/marketplace
                              |         hyperskill/marketplace
                              |
                        GENERAL CLAUDE CODE TOOLING
```

The top-right quadrant — hook-specific AND true marketplace — is empty. That is the position to occupy.

---

## Win Strategies Per Competitor Type

### vs. Awesome Lists (awesome-claude-code)
**Don't compete — get listed.** Submit the marketplace itself as an entry in the awesome-claude-code Hooks section within Week 1. The goal is to be what awesome-claude-code links to for installable hooks, not to replace it as a discovery layer. The awesome list drives top-of-funnel awareness; the marketplace converts that awareness into actual installs.

### vs. Broad Plugin Marketplaces (claudeforge, claude-market, hyperskill)
**Out-specialize them.** Go deeper on hooks than they ever will. A hook-specific search that filters by event type, handler type, and Claude Code version compatibility is worth more than a general plugin search. The hook-specific `hook.json` schema with capability declarations is worth more than a generic plugin schema. Hooks deserve their own home — be that home.

### vs. Code Libraries (karanb192, disler)
**Turn them into contributors.** These repos exist because there was nowhere better to put hooks. Give them somewhere better. Reach out to these authors personally in Week 1. Offer free certification as a founding contributor. Make them the first entries in the registry. Their credibility becomes the marketplace's credibility at launch.

### vs. TypeScript Frameworks (johnlindquist/claude-hooks)
**Build on their work.** The TypeScript typed payload system is valuable infrastructure. The `hookpm` TypeScript SDK should offer the same typed experience. Consider reaching out about a formal collaboration — their framework becomes the recommended way to write hooks published to hookpm. Shared interest: more hook authors → more hooks → more marketplace usage.

### vs. Anthropic (if they build an official registry)
**Own the security layer and enterprise.** Anthropic will not build rigorous third-party security audits. They will not build enterprise private registries with SSO, audit logs, and air-gapped mirrors. The certification badge becomes the trust signal that enterprise orgs require before deploying any hook — including hooks discovered in Anthropic's official registry. Position as complementary infrastructure, not competition.

---

## The Moat at 18 Months

If the marketplace executes well through Phase 2, these five things make it hard to displace:

1. **Catalog size and install history.** The registry with 500 hooks and verifiable install counts is the trusted registry, the same way npm is the trusted package registry. This data cannot be manufactured — it accumulates with time and usage.

2. **Security verification track record.** A record of zero security incidents from certified hooks, maintained over 18 months, is a trust asset worth more than any marketing budget. It takes 18 months to build and one incident to destroy — which is also why security infrastructure must be built first.

3. **Hook author relationships.** Founders of early-stage OSS tools stay loyal to the platforms that treated them well. Hook authors who joined early, got certified, and built audiences through the marketplace will advocate for it.

4. **Settings.json manipulation expertise.** The `hookpm install` merge algorithm — handling all edge cases of Claude Code's `settings.json` format across versions — is non-trivial engineering. The first implementation that handles all edge cases correctly becomes the reference implementation.

5. **First-mover SEO.** Individual hook landing pages (`/hooks/block-dangerous-commands`, `/hooks/auto-format-python`) indexed by Google accumulate domain authority over time. A challenger who starts 18 months later starts 18 months behind on organic search.

---

## Sources

- Research: `ws-existing.md` — competitive landscape inventory with GitHub repos and star counts
- Research: `ws-marketplace-models.md` — VS Code, GitHub Actions, npm, JetBrains, Zapier deep dives
- Research: `hook-marketplace-research.md` sections 3 and 4 — competitive assessment and opportunity verdict
- External: SecDev 2025 paper on GitHub Actions duplication rate
- External: Check Point Research CVE-2025-59536, CVE-2026-21852
