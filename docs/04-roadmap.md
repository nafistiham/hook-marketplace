# hookpm Roadmap

**Last updated:** 2026-03-10

This document covers how hookpm gets built — in what order, on what resources, and toward what specific outcomes. Phases are honest about what they cost and what has to be true before the next phase can start. Phases 0 and 1 run on founder time. Phase 3 onward requires revenue.

---

## The Sequencing Principle

Every phase gate is the CLI. If `hookpm install` does not work cleanly and correctly, nothing else matters. The website, the verification badge, the enterprise tier — all of them depend on developers trusting that installing a hook from this registry does exactly what it says. Build the CLI right before building anything else.

The second sequencing principle: ship the security model before shipping the scale strategy. The CVE findings (CVE-2025-59536, CVE-2026-21852) establish that shared hooks are a real attack surface — hooks in project-scoped `settings.json` files that auto-execute shell commands are a supply-chain risk. A marketplace that drives rapid adoption of unverified hooks before the security infrastructure exists will produce the incident that poisons the entire category. Automated static analysis and capability declarations ship at launch, not later.

---

## Week 1: Proof of Concept

**Cost:** Founder time only. No infrastructure spend.

**The one concrete thing to build:** A working `hookpm` CLI that installs from a real registry into a real `settings.json`. Not a design doc. Not a schema spec. Not a landing page. A CLI that a developer can run today and have it work.

### Day 1-2: The 10 Seed Hooks

Write and test the first 10 hooks from scratch. These are the reference implementations that everything else is judged against:

**Tier 1 — the five universal hooks:**
- `security/bash-guard` — blocks dangerous bash command patterns (`rm -rf /`, `curl | sh`, `fork bombs`, `/etc/passwd` access) via `PreToolUse`
- `security/file-protect` — blocks reads and writes to `.env`, `.git/`, `package-lock.json`, and credential files
- `quality/auto-format` — runs the correct formatter (Biome, Prettier, ruff, goimports) after every Edit/Write based on file extension
- `workflow/tdd-guard` — runs the project test suite after every code change and blocks Claude from declaring success if tests fail
- `workflow/env-bootstrap` — injects environment variables (AWS profile, nvm version, API keys) at `SessionStart` via `CLAUDE_ENV_FILE` without exposing them in project files

**Tier 2 — five hooks that cover emerging high-value patterns:**
- `observability/event-logger` — logs all 12+ lifecycle events (SubagentStart, TeammateIdle, TaskCompleted, etc.) to a local SQLite file for multi-agent workflow debugging
- `workflow/notify-desktop` — desktop notification when Claude pauses for permission or completes a task
- `workflow/slack-notify` — Slack webhook alert on permission requests and task completion
- `context/session-bootstrap` — re-injects architecture decisions and sprint context on `SessionStart` with `matcher: {source: "compact"}` to prevent compaction amnesia
- `security/prompt-injection-scanner` — scans `PreToolUse` inputs for prompt injection patterns using a lightweight regex library

Each hook ships with: a `hook.json` manifest with full capability declarations, a 5-line README, and automated tests against the actual Claude Code hook event JSON format.

### Day 3-4: The CLI (v0.1)

Three commands. Nothing else.

```
hookpm install <name>   — installs a hook and modifies settings.json
hookpm list             — shows installed hooks
hookpm remove <name>    — removes a hook and cleans settings.json
```

The `settings.json` manipulation is the hardest part technically and must be correct before anything else ships. It must handle four cases without error:
1. `settings.json` does not exist yet
2. File exists with no `hooks` key
3. File exists with hooks for other events (merge without clobbering)
4. Hook is already installed (idempotent, no duplication)

Write tests for all four cases before shipping. This is non-negotiable — a CLI that corrupts `settings.json` is worse than no CLI.

Install flow under the hood: fetch manifest from registry → clone hook source to `~/.hookpm/hooks/<name>@<version>/` → parse target `settings.json` → append correct hook block → print capability summary.

### Day 5: Registry Index

A static `registry.json` in the GitHub repo. The CLI fetches it from a raw GitHub URL. No server. No database. No infrastructure.

### Day 6: The GitHub Repo as the Product

Create the registry repository (`hookpm-registry/registry`) with:
- `hooks/` directory — one `hook.json` per hook
- `registry.json` — the static index
- `CONTRIBUTING.md` — how to submit a hook via PR
- `SECURITY.md` — capability declaration model, what "Verified" will mean, responsible disclosure contact
- One-line install script: `curl -fsSL https://raw.githubusercontent.com/hookpm-registry/registry/main/install.sh | bash`

### Day 7: Show HN

Post to Hacker News: "Show HN: hookpm — a package manager for Claude Code hooks."

The post shows the install command, the 10 hooks it ships with, and a before/after of `settings.json` being modified correctly. No pitch. No revenue model. Just: here is a thing that works, try it.

### Week 1 Success Criteria

| Metric | Target |
|---|---|
| Hooks installable via CLI | 10 |
| HN upvotes | >50 |
| First external hook submission (PR) | 1 |
| settings.json edge cases passing | 4/4 |
| First 100 CLI installs | By end of week 2 |

If the Show HN post gets >50 upvotes and one person submits a hook PR without being asked, the concept is validated. If it gets <20 upvotes, read the comments and rebuild before proceeding.

---

## Phase 1 (Months 1–3): Foundation

**Cost:** Founder time only. GitHub-backed infrastructure is free.

**Gate to enter:** Week 1 Show HN succeeded. CLI works. At least one external contributor.

**Gate to exit Phase 1:** 500-star repo, 1,000 hook installs/month, 20 external contributors.

### What Gets Built

**Registry (month 1):**
- 50 hooks across the major categories: security, code quality, testing, observability, notifications, git automation, context management
- Every hook has a `hook.json` manifest with capability declarations
- Automated static analysis runs on every PR (scan for `eval`, `curl | sh`, `base64 -d | bash`, credential exfiltration patterns, mismatched capability declarations)
- GitHub Actions CI pipeline: static analysis → manifest validation → registry index rebuild
- Submission process: PR with `hook.json` → automated checks → human review (founder) → merge

**CLI (month 1-2):**
- `hookpm search <term>` — keyword search across names, descriptions, tags
- `hookpm info <name>` — full manifest, capability declarations, install count
- `hookpm install <name>@<version>` — pinned version install
- `hookpm install github:<owner>/<repo>/<name>` — direct GitHub install before registry submission
- `hookpm update <name>` — updates to latest non-breaking version
- `hookpm update --check` — dry run showing available updates without applying
- Install from local path for development: `hookpm install --path ./my-hook`

**Documentation site (month 2):**
- Hook authoring guide: how to write a `hook.json`, capability declaration reference, testing your hook locally
- Registry submission guide: PR process, what automated analysis checks, review timeline
- User guide: install, update, remove, global vs project-scoped installs
- Security model documentation: what the capability declarations mean, what automated analysis catches, what it does not catch

**Hook schema (`hook.json`) finalized (month 2):**
The schema from week 1 is formalized and published as a versioned JSON Schema document. All registry hooks are validated against it. This is the format the entire ecosystem will be locked into — get it right before community hooks proliferate.

### Content Strategy for Reaching 50 Hooks

The founder builds the Tier 1 hooks (done in week 1). For the remaining 40:

- **Aggregate existing open-source hooks with attribution.** `karanb192/claude-code-hooks`, `disler/claude-code-hooks-mastery`, and `johnlindquist/claude-hooks` are already public. Reach out to authors, get permission, wrap their hooks in `hook.json` manifests, list them with full credit. This is not competition — it is giving their work a distribution layer.
- **Open bounties via GitHub Issues.** Label high-demand hooks as `bounty` with a specific description. The community will build them.
- **Language-specific formatter variants.** `quality/auto-format-go`, `quality/auto-format-rust`, `quality/auto-format-kotlin` are trivially authored from the base formatter hook — one afternoon, 5 new hooks, real value for specific language communities.
- **The TypeScript onramp.** Following the `johnlindquist/claude-hooks` model, provide a TypeScript hook template with typed payload schemas. This opens the contributor pool to developers who won't write shell scripts.

### Phase 1 Success Criteria

| Metric | Target |
|---|---|
| GitHub stars | 500 |
| Hook installs/month | 1,000 |
| Hooks in registry | 50 |
| External contributors | 20 |
| Passing automated static analysis | 100% of hooks |

---

## Phase 2 (Months 3–6): Community

**Cost:** Founder time. Zero infrastructure cost maintained — GitHub Pages, Cloudflare CDN.

**Gate to enter:** Phase 1 metrics hit. CLI is trusted (no corruption incidents). Contributor base is active.

**Gate to exit Phase 2:** 100 hooks, 5,000 installs/month, security review process defined and documented.

### What Gets Built

**Web search interface (month 3-4):**
A static site (Next.js or Astro, deployed on Vercel free tier) with:
- Searchable hook catalog by name, category, event type, language
- Individual hook pages: description, install command, capability declarations, version history, install count
- Category pages: `hookpm.dev/hooks/security`, `hookpm.dev/hooks/testing`
- These pages are the SEO surface. Every hook is a landing page that ranks for "[hook purpose] Claude Code." 100 hooks = 100+ indexed pages + category pages. This is the organic acquisition flywheel.

**Hook versioning and lockfile (month 4):**
- Semantic versioning enforced on all registry hooks
- `hookpm-lock.json` tracks installed hook versions (project-scoped at `.claude/hookpm-lock.json`, global at `~/.hookpm/hookpm-lock.json`)
- `hookpm update` respects lockfile; breaking changes (major version) require explicit `--major` flag
- Auto-update is never silent — a hook that silently updates shell-execution code is a security incident waiting to happen

**Category taxonomy (month 3, finalized by month 5):**
Define the official category tree before the long tail proliferates. Proposed top-level categories:
- `security` — guardrails, input scanning, file protection, prompt injection
- `quality` — formatters, linters, pre-commit
- `testing` — TDD enforcement, test runners, coverage gates
- `observability` — event logging, multi-agent monitoring, dashboards
- `workflow` — notifications, git automation, CI integration
- `context` — session bootstrap, compaction recovery, CLAUDE.md maintenance
- `integrations` — Slack, GitHub, Linear, Jira, cloud providers

Categories are enforced in the `hook.json` schema. Hooks that don't fit existing categories propose a new one via their submission PR.

**First 20 external contributors (ongoing):**
The target is 20 contributors who have merged at least one hook into the registry by month 6. Strategy:
- Personal outreach to authors of existing hook repos
- Response to every HN comment that mentions a use case not covered by existing hooks
- Recognition: contributor page, "Built by" attribution on every hook landing page, opt-in to contributor newsletter

**Security review process defined (month 4, even if manual):**
Document the full security review checklist for the Verified badge (coming in Phase 3). By the end of Phase 2, the checklist is written, a pilot review has been run on 2-3 hooks at no charge, and the process is proven even if not yet monetized. This allows Phase 3 to launch the paid program with confidence, not speculation.

### Phase 2 Success Criteria

| Metric | Target |
|---|---|
| Hook installs/month | 5,000 |
| Hooks in registry | 100 |
| External contributors | 20 |
| Security review checklist | Published |
| Pilot security reviews completed | 2-3 (free) |
| Web search interface | Live |
| Average hook page in Google index | Yes |

---

## Phase 3 (Months 6–12): Monetization Begins

**Cost:** Founder time + first revenue. This phase is where the business model is validated. If revenue does not materialize here, reassess before Phase 4.

**Gate to enter:** Phase 2 metrics hit. Security review process proven. Web presence driving organic installs.

**Gate to exit Phase 3:** First $1k MRR, 200+ hooks, enterprise waitlist with named companies.

### What Gets Built

**Verified certification program (month 6-7):**

The Verified badge program is the first revenue stream. Charge hook authors — not end users — for security review and the verified badge. End users always install for free.

Pricing:
- **Free:** Unverified listing. Automated static analysis only. CLI warns at install: "This hook is unverified. Review its source before installing."
- **Verified Individual — $99/year:** Human security review against the published checklist. Signed manifest. Verified badge on hook page and CLI install output. Up to 3 hooks per year.
- **Verified Organization — $299/year:** Same as Individual plus organization namespace (`@acme/bash-guard`), priority review turnaround (5 business days vs best-effort), up to 10 hooks per year.

Expected conversion: 5-10% of hooks with active installs will pursue Verified within 12 months of the badge launching. At 200 hooks and 10% conversion, that is 20 verified hooks × $150 average = ~$3,000/year initial. Small, but it validates that authors will pay for trust signals.

Install output for verified hooks:
```
Installing bash-guard@1.2.0 [VERIFIED — reviewed 2026-02-15]
Capabilities: stdin/stdout only. No network access. No file system writes.
Reviewed by: hookpm-security@
```

**Enterprise waitlist (month 7):**
A simple waitlist page explaining what the private registry will offer: SSO/SAML, audit logs, private namespaces, allowlist/denylist policy, air-gapped mirror. Collect company name, team size, primary use case. Target: 10 named companies on the waitlist by month 12.

The waitlist is not just marketing — it is product research. What features do the first 10 companies need most? Build those first in Phase 4.

**Private registry alpha (month 9-12):**
Pick 2-3 companies from the waitlist. Offer them a private registry alpha at no charge or heavily discounted in exchange for feedback. The alpha scope:
- Private namespace for internal hooks not visible publicly
- Basic audit log: which developer installed which hook version, from which machine, at what time
- Auth via GitHub org membership (no SSO yet — that comes in Phase 4)

The alpha exists to prove the architecture works for organizational use before charging for it. Two reference customers with working private registries are worth more than any amount of spec writing.

### Phase 3 Success Criteria

| Metric | Target |
|---|---|
| MRR | $1,000 |
| Hooks in registry | 200+ |
| Verified hooks | 15-20 |
| Enterprise waitlist | 10 named companies |
| Private registry alpha customers | 2-3 |
| CLI installs/month | 10,000+ |

---

## Phase 4 (Months 12–24): Scale

**Cost:** Revenue-funded. This phase cannot be built on founder time alone. It requires either revenue from Phase 3 or external funding.

**Gate to enter:** $1k MRR validated. At least 2 private registry alpha customers with positive feedback. Enterprise waitlist is real.

**Gate to exit Phase 4:** $10k MRR.

### What Gets Built

**Enterprise private registry GA (month 12-15):**

Three tiers, based directly on what alpha customers requested:

| Tier | Price | Seats | Features |
|---|---|---|---|
| Team | $299/month | Up to 25 | Private namespace, audit logs, GitHub org auth |
| Business | $799/month | Unlimited | All Team + SSO/SAML, allowlist/denylist policy |
| Enterprise | $2,000+/month | Unlimited | All Business + air-gapped mirror, dedicated SLA, Slack/Teams support |

The Team tier serves startups who need audit logs but cannot justify SSO setup. Business serves companies with a security team. Enterprise serves regulated industries — finance, healthcare, defense — who cannot pull from the public internet.

**SSO/SAML integration (month 13-16):**
SSO is a hard requirement for enterprise procurement. Without it, the product cannot get on an approved vendor list at most companies above 50 employees. Okta and Entra ID (Azure AD) cover >80% of the enterprise market. Build those two first.

**Audit logs (month 12-13, ahead of SSO):**
What ran on developer machines, when, and by whom. The compliance teams asking for this have been waiting since Phase 3's alpha. Ship it before SSO — it is architecturally simpler and unlocks the first Business tier conversations.

Format: structured JSON events per install/update/remove action, exportable to S3 or an internal SIEM. Not a pretty UI — an exportable structured log. Compliance teams know how to query JSON; they do not need a dashboard from an unknown vendor.

**Hook signing (cryptographic) (month 15-18):**
Verified hook manifests are signed with the registry's private key using minisign. The CLI verifies the signature at install time and rejects manifests that fail verification. This prevents:
- Manifest tampering in transit
- Registry index injection attacks
- Modified hooks distributed as originals

For enterprise customers: org-level signing. Organizations can sign their internal hooks with their own keypairs, independent of the public registry's key. This is the feature that unlocks "we trust our internal hooks but not public ones" enterprise security policies.

### Phase 4 Success Criteria

| Metric | Target |
|---|---|
| MRR | $10,000 |
| Enterprise customers (Business or Enterprise tier) | 3-5 |
| Team tier customers | 10+ |
| SSO integrations live | Okta, Entra ID |
| Cryptographic signing | Live for all Verified hooks |
| Hook installs/month | 50,000+ |

---

## Phase 5 (Months 24–48): Moat

**Cost:** Revenue-funded. Requires $10k+ MRR entering this phase to sustain the engineering investment.

**Gate to enter:** $10k MRR. Enterprise sales process proven. Security infrastructure credible enough for regulated industries.

**Gate to exit Phase 5:** $100k MRR.

**Honest note on the $100k MRR target:** This is a 3-4 year outcome, not a year-2 promise. It requires Claude Code to reach several million active developers — a platform bet on Anthropic's growth, not something hookpm controls. If Claude Code's user base stalls below 2 million active developers, the $100k MRR ceiling is lower than modeled here. This phase is built anyway because the infrastructure it creates is the moat.

### What Gets Built

**Extension beyond Claude Code (month 24-36, opportunistic):**
If other Claude-compatible tools — or tools with compatible hook architectures — emerge, the registry spec is already open source and the CLI is already capable of targeting different `settings.json` schemas. Extension to other tools is not a core roadmap item; it is an opportunistic expansion if the market develops in that direction. Do not build for hypothetical tools. Build when a real user base exists.

**Hosted hook execution (month 30-42):**
The current model requires developers to install hook scripts locally. Hosted execution means: the hook runs in a sandboxed cloud environment (Lambda or equivalent), the result is returned to the local Claude Code instance via HTTP. No local install required for the hook's logic.

This unlocks:
- Hooks for teams without local scripting permissions (corporate machines with lockdowns)
- Hooks that require cloud resources (database connections, internal API access) without credential distribution
- Usage-based billing as a new revenue stream ($X per 1,000 hook executions)

Hosted execution is architecturally hard and security-critical — sandboxing arbitrary hook code in the cloud is a non-trivial problem. Do not start it until the registry has 500+ hooks and enterprise customers are asking for it. The demand signal must exist before the investment.

### Phase 5 Success Criteria

| Metric | Target |
|---|---|
| MRR | $100,000 |
| Hooks in registry | 1,000+ |
| Hook installs/month | 250,000+ |
| Hosted execution | Live and billing |
| Enterprise customers | 20+ |

---

## What Stays Fixed Regardless of Phase

These are not subject to revision based on business pressure:

**The registry spec stays open source.** The `hook.json` schema, the registry index format, and the CLI source code are MIT-licensed and will remain so. If hookpm disappears, the ecosystem can reconstruct the distribution layer. This is not charity — it is the only way to earn the community trust that makes the enterprise tier credible.

**The CLI stays free.** Installing a hook from the public registry via `hookpm install` costs nothing, requires no account, and never will. Charging for CLI access would immediately make a fork economically rational for the community.

**Basic install/search stays free.** Discoverability and installation are free for all users forever. The paid tiers are about organizational control (SSO, audit logs, private registries) and author trust signals (Verified badge) — not about taxing basic use.

**Security findings are always publicly disclosed.** When a hook in the registry is found to contain malicious or dangerous behavior — whether discovered by automated analysis, a community report, or a security researcher — the finding is published in the registry's security advisory log within 72 hours. No burying incidents to protect reputation.

---

## The 1,000 Hooks Strategy

1,000 hooks is the right catalog target. How you get there determines whether it becomes an ecosystem or a junk drawer.

### The Cautionary Tale: GitHub Actions

GitHub Actions Marketplace crossed 10,000 actions in 2022. Within six months, 65% of new actions duplicated existing tools with minor variations. Discoverability collapsed. Developers now search npm or Stack Overflow for "GitHub Actions [thing]" instead of using the built-in marketplace search. This is what an undifferentiated volume strategy produces.

The goal for hookpm is not maximum hooks — it is JetBrains Marketplace at 8,000 plugins, where human review and a real quality bar make the catalog trustworthy, not npm at 2 million packages where every install is a security audit.

### The Three-Tier Content Model

**Tier 1 — Founder-built (10 hooks, built in week 1):**
The five security hooks and five workflow hooks that every Claude Code developer needs. These are the reference implementations. They must be excellent — actively maintained, well-documented, tested against every Claude Code update. Quality here sets the standard for everything else.

**Tier 2 — Community-built, curated (90 hooks, months 1-6):**
Language-specific formatters, framework-specific TDD guards, CI system integrations, specialized security policies. Built by community contributors, reviewed by the founder before merge. The contributor guide, PR template, and automated checks are what make Tier 2 contributions good — not heroic manual review of every PR.

**Tier 3 — Long-tail (900 hooks, months 6-36):**
The ecosystem builds itself when the infrastructure is right. A clear `hook.json` schema, automated static analysis, a reasonable PR review SLA, and attribution on every hook page are the incentives. The long tail cannot be manufactured — it emerges from a healthy Tier 1 and Tier 2.

### Quality Controls That Prevent Junk

- **Automated static analysis** blocks known-bad patterns before human review sees the PR
- **Capability declarations** are required and checked for plausibility against the code
- **A "Featured" collection** of 50-100 curated hooks is what the web UI shows by default — not raw browse-by-count. Featured hooks are human-selected for quality, maintenance, and use-case coverage. This is what users actually find useful.
- **Deprecation policy:** hooks with zero installs after 6 months and no maintainer activity are flagged as unmaintained and hidden from default search (still installable, just not surfaced)

### The SEO Flywheel

Every hook is a landing page. `hookpm.dev/hooks/bash-guard` ranks for "Claude Code bash command blocking hook." Every category is a landing page. `hookpm.dev/hooks/security` ranks for "Claude Code security hooks."

At 1,000 hooks across 50+ categories, the indexed page count is ~1,050 pages. At realistic developer-tool search volumes, this is a meaningful organic acquisition channel by year 2. The flywheel: more hooks → more landing pages → more organic search traffic → more CLI installs → more hook authors submitting hooks → more hooks.

Executing this requires individual hook pages with: description, exact `hookpm install` command, capability declarations, version history, install count, and the verification status. These are not nice-to-haves — they are the SEO surface area.

---

## Dependency Map

The table below makes explicit which phases can run on founder time and which require revenue.

| Phase | Revenue Required? | Key Dependency | Exits When |
|---|---|---|---|
| Week 1 | No | CLI correctness | Show HN validated |
| Phase 1 | No | External contributors | 500 stars, 1k installs/month |
| Phase 2 | No | Web presence + SEO | 100 hooks, 5k installs/month |
| Phase 3 | First revenue generated | Security review process | $1k MRR |
| Phase 4 | Yes — revenue-funded | Enterprise sales | $10k MRR |
| Phase 5 | Yes — $10k+ MRR entering | Platform growth | $100k MRR |

The critical bottleneck is Phase 3 to Phase 4: if the Verified certification program does not generate revenue, the enterprise private registry cannot be built at the quality level required for enterprise procurement. Phase 3's revenue does not need to be large — it needs to prove willingness to pay, not fund engineering salaries.

---

*Roadmap last updated 2026-03-10. Phase timelines assume consistent founder execution and no external funding. With funding, Phase 3 and Phase 4 could be compressed by 30-50% by hiring a second engineer for the enterprise registry work.*
