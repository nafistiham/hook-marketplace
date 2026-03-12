# Deep Dive: awesome-claude-code and everything-claude-code

**Date:** 2026-03-12

---

## 1. hesreallyhim/awesome-claude-code

**What it actually is:** A pure curated links list. Zero hook implementations — only external links with descriptions and an automation tooling layer for managing the list.

**CC BY-NC-ND 4.0 scope:** Covers the list compilation itself (curation, arrangement, descriptions). Does NOT cover the linked projects — those carry their own licenses. We can freely use all the linked hooks based on their individual licenses.

### New hooks discovered in the list (not in our original sweep)

| Name | Author | Repo | What it does |
|------|--------|------|-------------|
| **Dippy** | Lily Dayton | ldayton/Dippy | AST-based bash safety: auto-approves safe cmds, prompts on destructive ops — reduces permission fatigue |
| **TDD Guard** | Nizar Selander | nizos/tdd-guard | Monitors file ops in real-time; blocks changes violating TDD principles |
| **TypeScript Quality Hooks** | bartolli | bartolli/claude-code-typescript-hooks | tsc + lint + format with SHA256 caching to avoid redundant runs |
| **Plannotator** | backnotprop | backnotprop/plannotator | Intercepts ExitPlanMode; interactive visual plan annotation UI before approval |
| **Claudio** | Christopher Toth | ctoth/claudio | OS-native sounds via hooks |
| **Claude Code Hook Comms** | aannoo | aannoo/claude-hook-comms | Real-time inter-agent communication via hooks + dashboard |
| **claude-code-hooks-sdk (PHP)** | beyondcode | beyondcode/claude-hooks-sdk | Laravel-style PHP SDK for hook responses (skip for registry — PHP) |

**Licenses to check:** ldayton/Dippy, nizos/tdd-guard, bartolli/claude-code-typescript-hooks, backnotprop/plannotator, ctoth/claudio, aannoo/claude-hook-comms

---

## 2. affaan-m/everything-claude-code

**What it is:** A complete production-quality Node.js hook system. 25 actual implementation files + 8 shared library modules.

**License:** MIT

### Full Hook Inventory

| Event | Script | What it does |
|-------|--------|-------------|
| PreToolUse/Bash | `auto-tmux-dev.js` | Auto-start dev servers in tmux with directory-based session names |
| PreToolUse/Bash | `pre-bash-tmux-reminder.js` | Suggest tmux for long-running commands |
| PreToolUse/Bash | `pre-bash-git-push-reminder.js` | Remind to review changes before git push |
| PreToolUse/Write | `doc-file-warning.js` | Warn about non-standard documentation files |
| PreToolUse/Edit\|Write | `suggest-compact.js` | Suggest manual `/compact` at logical intervals |
| PreToolUse/* (async) | `insaits-security-wrapper.js` | Optional InsAIts AI security scan (opt-in via `ECC_ENABLE_INSAITS=1`) |
| PreCompact/* | `pre-compact.js` | Save state before context compaction |
| SessionStart/* | `session-start.js` | Inject previous session summary + detect package manager + project type into context |
| PostToolUse/Bash | `post-bash-pr-created.js` | Log PR URL + provide review command after `gh pr create` |
| PostToolUse/Bash (async) | `post-bash-build-complete.js` | Background build analysis |
| PostToolUse/Edit\|Write (async) | `quality-gate.js` | Biome/Prettier/gofmt/ruff checks after file edits |
| PostToolUse/Edit | `post-edit-format.js` | Auto-format JS/TS via Biome or Prettier |
| PostToolUse/Edit | `post-edit-typecheck.js` | Run `tsc --noEmit` on edited `.ts`/`.tsx` files |
| PostToolUse/Edit | `post-edit-console-warn.js` | Warn about `console.log` after edits |
| Stop/* | `check-console-log.js` | Audit git-modified JS/TS files for `console.log` |
| Stop/* (async) | `session-end.js` | Persist session transcript summary to `~/.claude/sessions/` |
| Stop/* (async) | `evaluate-session.js` | Extract reusable patterns from session |
| Stop/* (async) | `cost-tracker.js` | Append token/cost metrics to `~/.claude/metrics/costs.jsonl` |
| SessionEnd/* | `session-end-marker.js` | Non-blocking lifecycle marker |

### Quality Notes
- Every hook is non-blocking (exits 0 on all error paths)
- Cross-platform: Windows `.cmd` wrappers, POSIX paths
- Path traversal rejection in the `run-with-flags.js` dispatcher
- Performance: hooks exporting `run()` are `require()`'d directly — skips child process spawn (~50-100ms saved per call)
- Well-factored shared library: `utils.js`, `session-manager.js`, `package-manager.js`, `project-detect.js`, `resolve-formatter.js`
- 1MB stdin limit guards on all hooks

### Registry Candidates from ECC
Best individual hooks to extract and adapt:
- `cost-tracker.js` — unique, no equivalent in registry
- `session-start.js` — best session context injection implementation
- `session-end.js` — best transcript persistence
- `quality-gate.js` — multi-language formatter dispatcher
- `check-console-log.js` — clean, focused utility

---

## License Check Needed (new from awesome list)

| Repo | Status |
|------|--------|
| ldayton/Dippy | needs check |
| nizos/tdd-guard | needs check |
| bartolli/claude-code-typescript-hooks | needs check |
| backnotprop/plannotator | needs check |
| ctoth/claudio | needs check |
| aannoo/claude-hook-comms | needs check |
