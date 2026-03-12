# Hook Repository License Audit

**Date:** 2026-03-12
**Purpose:** Determine which repos can be included in the hookpm registry

---

## Summary Table

| # | Repo | License | can_include |
|---|------|---------|-------------|
| 1 | carlrannaberg/claudekit | MIT | ✅ yes |
| 2 | ryanlewis/claude-format-hook | MIT | ✅ yes |
| 3 | vaporif/parry | MIT | ✅ yes |
| 4 | mylee04/code-notify | MIT | ✅ yes |
| 5 | karanb192/claude-code-hooks | MIT | ✅ yes |
| 6 | kenryu42/claude-code-safety-net | MIT | ✅ yes |
| 7 | dazuiba/CCNotify | MIT | ✅ yes |
| 8 | lasso-security/claude-hooks | MIT | ✅ yes |
| 9 | Talieisin/britfix | MIT | ✅ yes |
| 10 | mafiaguy/claude-security-guardrails | MIT | ✅ yes |
| 11 | smykla-skalski/klaudiush | MIT | ✅ yes |
| 12 | paulpreibisch/AgentVibes | Apache 2.0 | ✅ yes |
| 13 | jvosloo/claude-voice | MIT | ✅ yes |
| 14 | ybouhjira/claude-code-tts | MIT | ✅ yes |
| 15 | TechNickAI/claude_telemetry | MIT | ✅ yes |
| 16 | ColeMurray/claude-code-otel | MIT | ✅ yes |
| 17 | nexus-labs-automation/agent-observability | MIT | ✅ yes |
| 18 | GowayLee/cchooks | MIT | ✅ yes |
| 19 | johnlindquist/claude-hooks | MIT | ✅ yes |
| 20 | gabriel-dehan/claude_hooks | MIT | ✅ yes |
| 21 | zxdxjtu/claudecode-rule2hook | MIT | ✅ yes |
| 22 | affaan-m/everything-claude-code | MIT | ✅ yes |
| 23 | harish-garg/security-scanner-plugin | MIT | ✅ yes |
| 24 | strataga/claude-setup | MIT | ✅ yes |
| 25 | husniadil/cc-hooks | MIT | ✅ yes |
| 26 | ChanMeng666/claude-code-audio-hooks | MIT | ✅ yes |
| 27 | disler/claude-code-hooks-mastery | **No license** | ⚠️ check — needs author permission |
| 28 | FlorianBruniaux/claude-code-ultimate-guide | CC BY-SA 4.0 | ⚠️ check — share-alike may impose obligations |
| 29 | shanraisshan/claude-code-voice-hooks | **No license** | ⚠️ check — needs author permission |
| 30 | markhilton/claude-code-voice-handler | MIT (unverified — repo may be deleted) | ⚠️ check |
| 31 | disler/claude-code-hooks-multi-agent-observability | **No license** | ⚠️ check — needs author permission |
| 32 | ChrisWiles/claude-code-showcase | **No license** | ⚠️ check — needs author permission |
| 33 | gjohnsx/claude-code-notification-hooks | **No license** | ⚠️ check — needs author permission |
| 34 | ChrisL108 gist | **No license** | ⚠️ check — needs author permission |
| 35 | anthropics/claude-code (examples) | Proprietary (Commercial ToS) | ❌ no |
| 36 | hesreallyhim/awesome-claude-code | CC BY-NC-ND 4.0 | ❌ no — no derivatives, no commercial |
| 37 | Dicklesworthstone/misc_coding_agent_tips_and_scripts | MIT + Anthropic/OpenAI exclusion rider | ❌ no — explicitly excludes Anthropic and affiliates |
| 38 | ldayton/Dippy | MIT | ✅ yes |
| 39 | nizos/tdd-guard | MIT | ✅ yes |
| 40 | bartolli/claude-code-typescript-hooks | MIT | ✅ yes |
| 41 | backnotprop/plannotator | Apache-2.0 AND MIT (dual) | ✅ yes |
| 42 | ctoth/claudio | **No license** | ⚠️ check — needs author permission |
| 43 | aannoo/claude-hook-comms | MIT | ✅ yes |

---

## Green Light (26 repos — include freely with attribution)

All MIT or Apache 2.0. Include with:
- `source_url` in source.json
- Original author credited in hook description
- License noted as MIT/Apache 2.0

**Priority picks:**
- `carlrannaberg/claudekit` — 14 hooks, best quality, pure Bash
- `ryanlewis/claude-format-hook` — multi-language formatter, clean
- `vaporif/parry` — best-in-class injection scanner (Rust)
- `lasso-security/claude-hooks` — security company backing
- `kenryu42/claude-code-safety-net` — destructive command guard
- `mafiaguy/claude-security-guardrails` — OWASP patterns
- `mylee04/code-notify` — best cross-platform notification (also supports Codex/Gemini)
- `husniadil/cc-hooks` — best TTS with multi-provider support
- `smykla-skalski/klaudiush` — best enterprise-grade security (Go)

---

## Needs Permission (8 repos — contact authors or skip)

These repos have no LICENSE file, meaning copyright is fully retained by the author. Options:
1. **Skip** — link to them from registry as "external hooks" instead of hosting
2. **Ask** — open a GitHub issue asking to add an MIT license
3. **Partial use** — if the implementation is trivially short, rewrite from scratch (not copying)

**Worth asking:**
- `disler/claude-code-hooks-mastery` — widely cited, Python hooks for all events
- `disler/claude-code-hooks-multi-agent-observability` — unique multi-agent observability
- `FlorianBruniaux/claude-code-ultimate-guide` — CC BY-SA 4.0 means we can include if we share-alike; manageable

---

## Hard No (3 repos — do not include)

- **anthropics/claude-code examples** — Anthropic's own commercial ToS; don't copy their examples, just link
- **hesreallyhim/awesome-claude-code** — CC BY-NC-ND: no commercial use, no derivatives
- **Dicklesworthstone** — MIT license explicitly excludes Anthropic and affiliates; hookpm is an Anthropic ecosystem tool, this exclusion applies

---

## Action Plan

1. **Batch adapt** the 26 green-light repos into `og-hooks/sourced/`
2. **Open issues** on the 5 unlicensed repos asking for MIT license
3. **Link-only** for Anthropic examples and CC BY-NC-ND
4. **FlorianBruniaux** — decide if CC BY-SA obligations are acceptable
