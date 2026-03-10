# Hook Marketplace — Documentation Index

**Project:** A hook-first marketplace for Claude Code hooks — open source registry, CLI package manager, security certification, and enterprise private registry.

**Status:** Pre-build research and planning phase.

**Date:** 2026-03-10

---

## How to Read This

Start with the overview layer if you're new to the idea or sharing with someone else. Go deep if you're planning to build, fund, or evaluate the technical feasibility.

**Read in order for a first pass:** `01` → `02` → `03` → `04` → `05`

**Jump to the deep layer** for whichever dimension you're working on next.

---

## Overview Layer (`/docs/`)

Short, readable, no assumed background. Each doc answers one question.

| Doc | Question it answers | Length |
|-----|--------------------|----|
| [`01-what-are-hooks.md`](./01-what-are-hooks.md) | What are Claude Code hooks and why do they matter? | ~550 lines |
| [`02-market-opportunity.md`](./02-market-opportunity.md) | Is there a real market here? Who pays and why? | ~260 lines |
| [`03-business-model.md`](./03-business-model.md) | How does this make money? What's free, what's paid? | ~195 lines |
| [`04-roadmap.md`](./04-roadmap.md) | What ships when? Week 1 through $100k MRR. | ~420 lines |
| [`05-competition.md`](./05-competition.md) | What exists today? What's the gap? How do we win? | ~280 lines |

---

## Deep Layer (`/docs/deep/`)

Full technical and financial detail. Intended for builders and decision-makers who need to go all the way down.

| Doc | What it contains | Length |
|-----|-----------------|-----|
| [`technical-spec.md`](./deep/technical-spec.md) | `hook.json` schema, registry architecture, `hookpm` CLI full spec, security model (4 layers), enterprise registry, settings.json merge algorithm | ~1,400 lines |
| [`financial-model.md`](./deep/financial-model.md) | Full cost structure per phase, revenue stream breakdowns, unit economics, break-even analysis, sensitivity analysis, funding considerations | ~395 lines |
| [`marketing-strategy.md`](./deep/marketing-strategy.md) | GTM, SEO flywheel, launch playbook, channel priority, security-as-marketing, enterprise motion, 12-month timeline | ~415 lines |
| [`risk-analysis.md`](./deep/risk-analysis.md) | 14-risk register, 6 scenario outcomes, legal/liability framework, security incident response, insurance guidance | ~655 lines |
| [`logistics.md`](./deep/logistics.md) | Legal structure, infra stack per phase, team structure, security review ops, hook submission workflow, payment processing, tooling choices | ~360 lines |
| [`competitive-deep.md`](./deep/competitive-deep.md) | Full teardown of every player, Anthropic threat scenarios, 3 analogous market histories, positioning matrix, win strategies | ~in progress |

---

## The One-Paragraph Summary

Claude Code hooks are a programmable governance layer between Claude's intent and execution — every file write, bash command, web request, and agent spawn can be intercepted, approved, modified, or blocked. Developers are building hooks for safety, formatting, TDD enforcement, and observability, but sharing them via copy-paste from GitHub with no security review, no versioning, and no one-command install. Two CVEs (2025, 2026) document RCE via shared hooks. No hook-first marketplace exists. This project builds one: an open source registry + `hookpm` CLI (free forever) + security certification for hook authors ($99–$299/year) + enterprise private registry for organizations ($299–$2,000/month). The verdict from research: build it, lead with security, go slow on monetization.

---

## Key Numbers at a Glance

| Metric | Value |
|--------|-------|
| Hook events available | 18 |
| Handler types | 4 (command, http, prompt, agent) |
| CVEs in shared hooks | 2 (CVE-2025-59536, CVE-2026-21852) |
| Existing hook-first marketplace | None |
| Closest competitor star count | 21.6k (awesome-claude-code — a directory, not a marketplace) |
| Week 1 target | 10 hooks, working CLI, Show HN |
| Phase 1 infra cost | ~$10/month (GitHub-backed) |
| Break-even (Phase 2) | 2–3 enterprise customers |
| Target $10k MRR | Month 24 |
| Target $100k MRR | Month 36–48 |
| Revenue model | Open core: free registry + paid certification + enterprise |

---

## The Go / No-Go Verdict

**Go.** With one condition: build the security infrastructure before marketing. The CVE findings are both the product story and the biggest risk. A marketplace that solves the trust problem is defensible. A marketplace that ships a weaponized hook in Month 3 is finished.

Full reasoning in [`02-market-opportunity.md`](./02-market-opportunity.md) and [`deep/risk-analysis.md`](./deep/risk-analysis.md).

---

## Week 1 Concrete Action

Build `hookpm` with three commands:
```bash
hookpm install block-dangerous-commands
hookpm list
hookpm remove block-dangerous-commands
```

10 hooks in the registry. Correct `settings.json` manipulation. Post to Show HN.

Full spec in [`deep/technical-spec.md`](./deep/technical-spec.md). Full launch playbook in [`deep/marketing-strategy.md`](./deep/marketing-strategy.md).
