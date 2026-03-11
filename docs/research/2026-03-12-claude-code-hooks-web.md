# Web Research: All Known Claude Code Hooks

**Date:** 2026-03-12
**Purpose:** Catalog every publicly available Claude Code hook for potential registry inclusion

---

## Official Anthropic

- **Docs + examples** — https://github.com/anthropics/claude-code/blob/main/examples/hooks/
  - `bash_command_validator_example.py` — PreToolUse/Bash — Python
  - Prettier PostToolUse, protect-files.sh PreToolUse, osascript/notify-send Notification, SessionStart compact re-injection, ConfigChange audit log

---

## Curated Collections

### awesome-claude-code — https://github.com/hesreallyhim/awesome-claude-code
Master list maintained by community. Source for several hooks below.

### carlrannaberg/claudekit — https://github.com/carlrannaberg/claudekit — MIT
14 production-quality Bash hooks:
- `file-guard` — PreToolUse — 195+ sensitive file patterns (cloud creds, SSH, crypto wallets)
- `typecheck-changed` — PostToolUse — TypeScript tsc on edited files
- `lint-changed` — PostToolUse — Biome/ESLint on changed files
- `test-changed` — PostToolUse — runs relevant tests for modified files
- `check-any-changed` — PostToolUse — forbids TypeScript `any` in changed files
- `check-comment-replacement` — PostToolUse — detects code replaced with TODO comments
- `check-unused-parameters` — PostToolUse — flags underscore-prefixed lazy params
- `codebase-map` — UserPromptSubmit — invisible codebase context once/session
- `thinking-level` — UserPromptSubmit — injects reasoning enhancement keywords
- `typecheck-project` — Stop/SubagentStop — full TypeScript validation
- `lint-project` — Stop/SubagentStop — full lint
- `test-project` — Stop/SubagentStop — full test suite
- `create-checkpoint` — Stop — auto git checkpoint commit
- `self-review` — Stop — enhanced implementation completeness review

### disler/claude-code-hooks-mastery — https://github.com/disler/claude-code-hooks-mastery
Python/UV hooks for all 13+ event types:
- `user_prompt_submit.py` — validation, logging, context injection
- `pre_tool_use.py` — security blocking + logging
- `post_tool_use.py` — logging + transcript conversion
- `post_tool_use_failure.py` — structured error logging
- `notification.py` — logging + optional TTS
- `stop.py` — AI-generated TTS completion (ElevenLabs > OpenAI > pyttsx3)
- `subagent_stop.py` — TTS announcement
- `subagent_start.py` — spawn logging + audio
- `pre_compact.py` — transcript backup
- `session_start.py` — dev context loading
- `session_end.py` — cleanup + exit logging
- `permission_request.py` — auditing + auto-allow read-only
- `ruff_validator.py` / `ty_validator.py` — PostToolUse Python linting + type checking

### FlorianBruniaux/claude-code-ultimate-guide — https://github.com/FlorianBruniaux/claude-code-ultimate-guide/tree/main/examples/hooks
40+ Bash scripts:
- `dangerous-actions-blocker.sh` — PreToolUse — `rm -rf /`, DB drops, force pushes
- `security-check.sh` — PreToolUse — password/API key detection
- `prompt-injection-detector.sh` — PreToolUse — jailbreak + role override patterns
- `unicode-injection-scanner.sh` — PreToolUse — zero-width chars, RTL overrides, ANSI escapes
- `repo-integrity-scanner.sh` — PreToolUse — README/package.json hidden injection
- `claudemd-scanner.sh` — SessionStart — malicious CLAUDE.md instruction detection
- `output-secrets-scanner.sh` — PostToolUse — leaked credentials in tool outputs
- `security-gate.sh` — PreToolUse — vulnerable code patterns before write
- `session-summary.sh` — SessionEnd — 15-section analytics (costs, tokens, files, git diffs)
- `rtk-baseline.sh` — SessionStart — token cache stats baseline
- `auto-format.sh` — PostToolUse — Prettier/Black/etc.
- `session-logger.sh` — PostToolUse — JSONL ops log for cost analysis
- `output-validator.sh` — PostToolUse — heuristic validation, flags placeholders/uncertainty
- `velocity-governor.sh` — PreToolUse — rate-limits tool calls
- `auto-rename-session.sh` — SessionEnd — AI-powered session title via Claude Haiku

### ChrisWiles/claude-code-showcase — https://github.com/ChrisWiles/claude-code-showcase
- `main-branch-protect` — PreToolUse — blocks file edits on main branch — Bash
- `skill-evaluator` — UserPromptSubmit — surfaces relevant skills from rules file — Shell/JS
- post-tool quality — PostToolUse — auto-format + test + lint after edits

### karanb192/claude-code-hooks — https://github.com/karanb192/claude-code-hooks
- `block-dangerous-commands` — PreToolUse/Bash — blocks `rm -rf ~`, fork bombs, `curl|sh` — JS
- `protect-secrets` — PreToolUse — guards credential files — JS
- `auto-stage` — PostToolUse/Edit|Write — `git add` after modifications — JS
- `notify-permission` — Notification — Slack alerts — JS
- `event-logger` — all events — full payload debug logger — Python

---

## Security

### vaporif/parry — https://github.com/vaporif/parry — (check license)
PreToolUse + PostToolUse + UserPromptSubmit — prompt injection scanner:
- Unicode obfuscation detection
- 40+ credential regex patterns
- DeBERTa v3 ML semantic injection detection
- AST exfiltration detection across 16 languages
- ~50-70ms/chunk — **Rust**

### lasso-security/claude-hooks — https://github.com/lasso-security/claude-hooks
- `prompt-injection-defender` — PostToolUse — 5 injection categories (instruction override, DAN/role-play, encoding, context manipulation, HTML comment smuggling) — Python + TypeScript

### mafiaguy/claude-security-guardrails — https://github.com/mafiaguy/claude-security-guardrails
- PreToolUse — blocks `rm -rf`, force git push, `cat .env`, SQL drops, OWASP vulns, `eval()`, hardcoded secrets — Node.js
- PostToolUse — full vulnerability scan on written files, 30+ patterns — Node.js

### kenryu42/claude-code-safety-net — https://github.com/kenryu42/claude-code-safety-net
- PreToolUse — `git reset --hard`, `git checkout --`, `git push --force`, `rm -rf` patterns, shell-wrapped obfuscation, interpreter one-liner bypasses

### smykla-skalski/klaudiush — https://github.com/smykla-skalski/klaudiush
- PreToolUse — Go dispatcher: conventional commit format, branch naming, push policies; linters (shellcheck, terraform fmt, actionlint, gofumpt, ruff, oxlint, rustfmt); 25+ secret patterns + gitleaks; file path protection — **Go**, TOML config

### harish-garg/security-scanner-plugin — https://github.com/harish-garg/security-scanner-plugin
- Scans for CVEs via GitHub advisory data — Python

---

## Formatting / Code Quality

### ryanlewis/claude-format-hook — https://github.com/ryanlewis/claude-format-hook
- PostToolUse (Edit|MultiEdit|Write) — JS/TS → Biome (Prettier fallback); Python → Ruff; Markdown → Prettier; Go → goimports+go fmt; Kotlin → ktlint — Bash

---

## Notifications

### ChrisL108 macOS gist — https://gist.github.com/ChrisL108/9fcd7807283816c0f75354f246cdab01
- PreToolUse (WebSearch|WebFetch) — "Searching the web" + Morse sound — Bash
- PermissionRequest — "Need approval" + Sosumi sound — Bash
- PostToolUse (Bash) — auto-detects git commits/npm tests from stdin — Bash
- Stop — rocket icon "Finished!" + Glass sound — Bash (osascript)

### gjohnsx/claude-code-notification-hooks — https://github.com/gjohnsx/claude-code-notification-hooks
- Notification — contextual emoji desktop alerts — Python
- Stop — completion confirmation + sound — Python
- UserPromptSubmit — appends ultrathink when prompt ends with `-u` — Python
- PreToolUse + PostToolUse — MCP tool logging — Python
- SessionStart — session tracking files — Shell

### mylee04/code-notify — https://github.com/mylee04/code-notify — MIT
- Notification — cross-platform desktop + sound (macOS afplay, Linux paplay/aplay, Windows SoundPlayer)
- Supports Claude Code, Codex, Gemini CLI — Shell

### dazuiba/CCNotify — https://github.com/dazuiba/CCNotify
- UserPromptSubmit + Stop + Notification — desktop notifications + sqlite logging — Python (macOS)

---

## TTS / Voice

| Repo | Events | Notes | Lang |
|------|--------|-------|------|
| [husniadil/cc-hooks](https://github.com/husniadil/cc-hooks) | 9 events | Google TTS + ElevenLabs + prerecorded; multi-language | Python |
| [ChanMeng666/claude-code-audio-hooks](https://github.com/ChanMeng666/claude-code-audio-hooks) | 14 events | audio MP3 + desktop notifications + TTS; cross-platform | Python/Bash/PS |
| [ybouhjira/claude-code-tts](https://github.com/ybouhjira/claude-code-tts) | Stop | OpenAI TTS reads every response | Python |
| [markhilton/claude-code-voice-handler](https://github.com/markhilton/claude-code-voice-handler) | Stop + others | context-aware OpenAI TTS | Python |
| [paulpreibisch/AgentVibes](https://github.com/paulpreibisch/AgentVibes) | Stop + others | 914+ voices, custom background music | Python |
| [shanraisshan/claude-code-voice-hooks](https://github.com/shanraisshan/claude-code-voice-hooks) | Pre+Post+Stop | pre-recorded voice feedback | Shell |
| [jvosloo/claude-voice](https://github.com/jvosloo/claude-voice) | multiple | push-to-talk Whisper STT + Piper TTS, macOS | Python |

---

## Git Workflow

### blog.gitbutler.com — https://blog.gitbutler.com/automate-your-ai-workflows-with-claude-code-hooks
- Stop — auto-commits using prompt as message — Ruby
- PreToolUse — per-session git index — Ruby
- PostToolUse — stages files to session index — Ruby
- Stop — commits to `refs/heads/claude/<session-id>` isolated branch — Ruby

### docs.gitbutler.com — https://docs.gitbutler.com/features/ai-integration/claude-code-hooks
- PostToolUse — stages files to GitButler virtual/stacked branches

### Dicklesworthstone destructive git guard — https://github.com/Dicklesworthstone/misc_coding_agent_tips_and_scripts/blob/main/DESTRUCTIVE_GIT_COMMAND_CLAUDE_HOOKS_SETUP.md
- PreToolUse — `git reset --hard`, `git checkout --`, `git push --force`, `git clean -fd`

### strataga/claude-setup — https://github.com/strataga/claude-setup
- Stop auto-commit + PostToolUse git staging

---

## Session / Context Management

### dorothyjb Mother CLAUDE — https://dev.to/dorothyjb/mother-claude-automating-everything-with-hooks-12jh
- `session_handoff.py` — PreCompact + SessionEnd — auto-generates handoff docs via Claude Haiku from transcript
- `session_start.py` — SessionStart — loads most recent handoff doc into context
- `auto_approve.py` — PermissionRequest — auto-approves safe ops, blocks sudo/force push

### affaan-m/everything-claude-code — https://github.com/affaan-m/everything-claude-code
- Memory persistence (SessionStart/End), strategic compaction (PreCompact), session evaluation (Stop) — Node.js

---

## Observability

| Repo | Notes | Lang |
|------|-------|------|
| [disler/claude-code-hooks-multi-agent-observability](https://github.com/disler/claude-code-hooks-multi-agent-observability) | 13 hooks, real-time multi-agent visualization | Python |
| [TechNickAI/claude_telemetry](https://github.com/TechNickAI/claude_telemetry) | OTel → Logfire/Sentry/Honeycomb/Datadog | Python |
| [ColeMurray/claude-code-otel](https://github.com/ColeMurray/claude-code-otel) | usage/cost/performance JSONL logging | Python |
| [nexus-labs-automation/agent-observability](https://github.com/nexus-labs-automation/agent-observability) | 7 observability anti-pattern detectors | Python |

---

## Frameworks / SDKs

| Repo | Notes | Lang |
|------|-------|------|
| [GowayLee/cchooks](https://github.com/GowayLee/cchooks) | SDK for 9 event types, one-liner create_context() | Python |
| [johnlindquist/claude-hooks](https://github.com/johnlindquist/claude-hooks) | TypeScript framework, type-safe templates | TypeScript |
| [gabriel-dehan/claude_hooks](https://github.com/gabriel-dehan/claude_hooks) | Ruby DSL, 9 event types, base classes | Ruby |
| [zxdxjtu/claudecode-rule2hook](https://github.com/zxdxjtu/claudecode-rule2hook) | plain English → hook JSON configs | Python/Shell |

---

## Misc / Unique

### Talieisin/britfix — https://github.com/Talieisin/britfix
- PostToolUse — converts American→British English in comments/docstrings only, not code identifiers — Python

### gjohnsx ultrathink shortcut
- UserPromptSubmit — appends "use ultrathink" when prompt ends with `-u`

---

## Catalog Status

| Hook | Source | License | Status |
|------|--------|---------|--------|
| claudekit (14 hooks) | carlrannaberg/claudekit | MIT | `discovered` |
| format-hook | ryanlewis/claude-format-hook | (check) | `discovered` |
| parry | vaporif/parry | (check) | `discovered` |
| code-notify | mylee04/code-notify | MIT | `discovered` |
| claude-code-hooks | karanb192 | (check) | `discovered` |
| safety-net | kenryu42 | (check) | `discovered` |
| CCNotify | dazuiba | (check) | `discovered` |
| claude-hooks (lasso) | lasso-security | (check) | `discovered` |
| hooks-mastery | disler | (check) | `discovered` |
| ultimate-guide hooks | FlorianBruniaux | (check) | `discovered` |
| britfix | Talieisin | (check) | `discovered` |
| session handoff | dorothyjb | (check) | `discovered` |
| gitbutler hooks | gitbutler | (check) | `discovered` |
| security-guardrails | mafiaguy | (check) | `discovered` |
| klaudiush | smykla-skalski | (check) | `discovered` |
| TTS hooks (various) | multiple | (check) | `discovered` |
