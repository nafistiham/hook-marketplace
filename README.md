# hookpm — The Claude Code Hook Marketplace

**The open-source package manager for Claude Code hooks.**
Install, share, and discover hooks that automate safety checks, formatting, git workflows, and more — all from one place.

```bash
npm install -g hookpm
hookpm install secret-scan-guard      # blocks commits with API keys
hookpm install format-on-write        # auto-formats every file Claude touches
hookpm install bash-danger-guard      # catches rm -rf and curl | sh
```

---

## Table of Contents

- [What Are Hooks?](#what-are-hooks)
- [Quick Start](#quick-start)
- [CLI Reference](#cli-reference)
  - [install](#install)
  - [remove](#remove)
  - [list](#list)
  - [search](#search)
  - [info](#info)
  - [verify](#verify)
  - [publish](#publish)
  - [login / logout](#login--logout)
- [The Registry — 50 Hooks](#the-registry--50-hooks)
  - [Security](#security)
  - [Code Quality](#code-quality)
  - [Git & Workflow](#git--workflow)
  - [Formatting & Validation](#formatting--validation)
  - [Linting & Static Analysis](#linting--static-analysis)
  - [Developer Experience](#developer-experience)
- [Trust Signals](#trust-signals)
- [How Hooks Work](#how-hooks-work)
  - [Event Types](#event-types)
  - [Exit Codes](#exit-codes)
  - [The hook.json Schema](#the-hookjson-schema)
- [Submitting a Hook](#submitting-a-hook)
  - [Hook Requirements](#hook-requirements)
  - [Writing a Good hook.json](#writing-a-good-hookjson)
  - [Security Review Process](#security-review-process)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## What Are Hooks?

[Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) are programs that run automatically at specific points during a Claude Code session — before a tool runs, after it completes, or when the session ends. They let you add safety checks, auto-formatting, logging, and more — without touching your codebase.

**hookpm** makes hooks shareable. Think `npm install` but for Claude Code hooks:

- Download and install any hook in one command
- Hooks merge into your `~/.claude/settings.json` safely — no clobbering
- A lockfile (`hookpm.lock`) tracks exactly what you have installed
- Publish your own hooks from any directory — no PR required for author-published hooks

**No accounts needed to install hooks.** An account (GitHub OAuth) is required only to publish.

---

## Quick Start

```bash
# Install hookpm
npm install -g hookpm

# Browse all available hooks
hookpm search

# Install a starter security bundle
hookpm install bash-danger-guard --prepend
hookpm install secret-scan-guard --prepend
hookpm install env-leak-guard --prepend

# See what you have installed
hookpm list

# Remove a hook
hookpm remove bash-danger-guard
```

Hooks are live immediately after installation — no Claude restart needed.

---

## CLI Reference

### install

```bash
hookpm install <name> [--prepend]
```

Downloads and installs a hook from the registry.

| Flag | Description |
|------|-------------|
| `--prepend` | Add the hook at the **start** of its event array. Use this for security hooks that must run before other hooks. |

What happens under the hood:
1. Fetches `hook.json` and the source archive from the registry
2. Verifies the archive SHA-256 checksum
3. Extracts to `~/.hookpm/hooks/<name>/`
4. Merges the hook command into `~/.claude/settings.json` under the correct event key — never overwrites an existing entry with the same name
5. Writes `hookpm.lock` in the current directory

```bash
hookpm install bash-danger-guard --prepend   # security hooks run first
hookpm install format-on-write               # DX hooks anywhere
```

---

### remove

```bash
hookpm remove <name>
```

Removes the hook from `~/.claude/settings.json` and updates `hookpm.lock`. Does not delete the downloaded files from `~/.hookpm/hooks/` (keeps re-installs fast).

---

### list

```bash
hookpm list
```

Shows all hooks currently wired into your `~/.claude/settings.json`, grouped by event type (PreToolUse / PostToolUse / Stop).

---

### search

```bash
hookpm search [query]
hookpm search --tag security
hookpm search --event PreToolUse
```

Searches the registry index. Without arguments, lists all 50 hooks with their health tier, event type, and one-line description.

| Flag | Description |
|------|-------------|
| `--tag <tag>` | Filter by tag — e.g. `security`, `git`, `formatting`, `python` |
| `--event <event>` | Filter by event type — `PreToolUse`, `PostToolUse`, or `Stop` |

---

### info

```bash
hookpm info <name>
```

Shows the full manifest for a hook: description, capabilities, required permissions, trust signals, community rating, and the exact command that will be added to `settings.json`.

---

### verify

```bash
hookpm verify <name>
```

Re-downloads the hook archive and recomputes its SHA-256, comparing against the locally installed version. Confirms nothing has been tampered with since install.

---

### publish

```bash
hookpm publish
```

Publishes the hook in the current directory to the registry. Requires:
- A valid `hook.json` in the current directory (validated against the schema)
- Being logged in (`hookpm login`)
- All source files referenced by `handler.command` present in the directory

The publish command:
1. Validates `hook.json` against the full Zod schema
2. Runs automated static analysis (network call detection, subprocess detection)
3. Bundles your files into a `.tar.gz` archive
4. Checks for conflicts (same name + version already exists → rejected)
5. Uploads archive + manifest to the registry
6. Rebuilds the registry index with your hook's trust signals

---

### login / logout

```bash
hookpm login     # opens GitHub OAuth in your browser, polls for the token
hookpm logout    # removes your local auth token
```

`hookpm login` opens `https://hookpm.dev/auth/callback` in your browser, then polls for the resulting JWT every 2 seconds (times out after 5 minutes). The token is stored at `~/.hookpm/auth.json` with mode 600 (readable only by you).

---

## The Registry — 50 Hooks

All hooks are open-source, MIT-licensed, and statically analysed before inclusion.

### Security

**Install these with `--prepend` so they run before other hooks.**

| Hook | Event | Description |
|------|-------|-------------|
| [`bash-danger-guard`](registry/hooks/bash-danger-guard) | PreToolUse | Blocks `rm -rf`, `chmod 777`, `curl \| sh`, `dd`, fork bombs, and raw device writes |
| [`secret-scan-guard`](registry/hooks/secret-scan-guard) | PreToolUse | Detects API keys, tokens, and credentials in files before they are written |
| [`env-leak-guard`](registry/hooks/env-leak-guard) | PreToolUse | Prevents `.env` files and environment variables from being written with real secrets |
| [`sensitive-file-guard`](registry/hooks/sensitive-file-guard) | PreToolUse | Blocks reads and writes to `~/.ssh`, `~/.aws`, `~/.gnupg`, and similar sensitive paths |
| [`dockerfile-secrets-guard`](registry/hooks/dockerfile-secrets-guard) | PreToolUse | Catches hardcoded credentials inside `ENV` and `RUN` instructions in Dockerfiles |
| [`cors-wildcard-guard`](registry/hooks/cors-wildcard-guard) | PreToolUse | Flags `Access-Control-Allow-Origin: *` in API route handlers and server config |
| [`open-redirect-guard`](registry/hooks/open-redirect-guard) | PreToolUse | Detects redirect-from-user-input patterns that could enable phishing |
| [`sql-injection-guard`](registry/hooks/sql-injection-guard) | PreToolUse | Detects string-interpolated SQL queries that bypass parameterisation |
| [`insecure-random-guard`](registry/hooks/insecure-random-guard) | PreToolUse | Catches `Math.random()` and `random.random()` in security-sensitive contexts |
| [`weak-crypto-guard`](registry/hooks/weak-crypto-guard) | PreToolUse | Blocks MD5, SHA-1, DES, and RC4 usage in cryptographic contexts |
| [`no-eval-guard`](registry/hooks/no-eval-guard) | PreToolUse | Blocks `eval()`, `exec()`, and `new Function()` dynamic execution patterns |
| [`prototype-pollution-guard`](registry/hooks/prototype-pollution-guard) | PreToolUse | Detects `__proto__` assignments and unsafe object-merge patterns |
| [`port-scan-guard`](registry/hooks/port-scan-guard) | PreToolUse | Flags code that iterates over port ranges or constructs port scanners |
| [`hardcoded-url-guard`](registry/hooks/hardcoded-url-guard) | PreToolUse | Catches hardcoded production URLs, IPs, and API endpoints in source code |
| [`critical-path-guard`](registry/hooks/critical-path-guard) | PreToolUse | Blocks writes to auth, payment, and migration files unless explicitly bypassed |
| [`dependency-install-gate`](registry/hooks/dependency-install-gate) | PreToolUse | Blocks unapproved `npm install`, `pip install`, `yarn add` — prevents supply-chain attacks |
| [`no-direct-push-guard`](registry/hooks/no-direct-push-guard) | PreToolUse | Prevents `git push --force` and direct pushes to `main` / `master` |

---

### Code Quality

| Hook | Event | Description |
|------|-------|-------------|
| [`typescript-noany-guard`](registry/hooks/typescript-noany-guard) | PostToolUse | Fails when Claude writes explicit `any` type annotations in TypeScript |
| [`unused-import-guard`](registry/hooks/unused-import-guard) | PostToolUse | Detects unused imports in TypeScript, Python, and Go after each edit |
| [`no-sleep-guard`](registry/hooks/no-sleep-guard) | PostToolUse | Warns on `time.sleep()`, `sleep()`, and `Thread.sleep()` outside test files |
| [`long-line-guard`](registry/hooks/long-line-guard) | PostToolUse | Flags lines exceeding a configurable character limit (default: 120) |
| [`file-size-guard`](registry/hooks/file-size-guard) | PostToolUse | Warns when a file grows beyond a configurable line count (default: 500 lines) |
| [`print-statement-guard`](registry/hooks/print-statement-guard) | PostToolUse | Detects leftover `print()`, `console.log()`, and `puts` debug statements |
| [`console-log-guard`](registry/hooks/console-log-guard) | PostToolUse | Specifically targets `console.log` / `console.debug` in JavaScript/TypeScript |
| [`debug-artifact-guard`](registry/hooks/debug-artifact-guard) | PostToolUse | Catches `debugger` statements, `pdb.set_trace()`, and `binding.pry` calls |
| [`large-file-upload-guard`](registry/hooks/large-file-upload-guard) | PreToolUse | Blocks writes to files above a configurable size threshold (default: 1 MB) |
| [`sql-query-builder-guard`](registry/hooks/sql-query-builder-guard) | PostToolUse | Detects raw SQL mixed into application code that should use a query builder |
| [`code-complexity-guard`](registry/hooks/code-complexity-guard) | PostToolUse | Warns when a single edit touches more than 200 lines — a signal of scope creep |
| [`todo-tracker`](registry/hooks/todo-tracker) | PostToolUse | Logs `TODO`, `FIXME`, and `HACK` comments added during the session to a file |

---

### Git & Workflow

| Hook | Event | Description |
|------|-------|-------------|
| [`git-commit-lint`](registry/hooks/git-commit-lint) | PreToolUse | Enforces [Conventional Commits](https://www.conventionalcommits.org/) format on `git commit` |
| [`no-direct-push-guard`](registry/hooks/no-direct-push-guard) | PreToolUse | Prevents force-pushes and direct pushes to protected branches |
| [`conflict-marker-guard`](registry/hooks/conflict-marker-guard) | PreToolUse | Blocks writes containing `<<<<<<<`, `=======`, or `>>>>>>>` merge conflict markers |
| [`auto-stage`](registry/hooks/auto-stage) | PostToolUse | Runs `git add` on every file Claude edits, keeping the staging index in sync |
| [`create-checkpoint`](registry/hooks/create-checkpoint) | PostToolUse | Creates a `git stash` checkpoint after each significant edit for easy rollback |

---

### Formatting & Validation

| Hook | Event | Description |
|------|-------|-------------|
| [`format-on-write`](registry/hooks/format-on-write) | PostToolUse | Auto-formats after every write: Prettier for JS/TS, Black for Python, gofmt for Go |
| [`eslint-on-edit`](registry/hooks/eslint-on-edit) | PostToolUse | Runs ESLint with `--fix` on JavaScript and TypeScript files after each edit |
| [`json-syntax-guard`](registry/hooks/json-syntax-guard) | PostToolUse | Validates JSON syntax immediately after a file is written |
| [`yaml-lint`](registry/hooks/yaml-lint) | PostToolUse | Runs `yamllint` on YAML files after every write |
| [`xml-syntax-guard`](registry/hooks/xml-syntax-guard) | PostToolUse | Validates XML/SVG syntax with `xmllint` after each write |

---

### Linting & Static Analysis

| Hook | Event | Description |
|------|-------|-------------|
| [`shellcheck-guard`](registry/hooks/shellcheck-guard) | PostToolUse | Runs ShellCheck on `.sh` and `.bash` files — blocks on errors |
| [`semgrep-guard`](registry/hooks/semgrep-guard) | PostToolUse | Runs Semgrep with the `p/default` ruleset on changed files |
| [`dockerfile-lint`](registry/hooks/dockerfile-lint) | PostToolUse | Runs Hadolint on Dockerfiles to enforce best practices |
| [`terraform-security-guard`](registry/hooks/terraform-security-guard) | PostToolUse | Runs `tfsec` on Terraform files to detect misconfigurations |
| [`kubernetes-resource-guard`](registry/hooks/kubernetes-resource-guard) | PostToolUse | Validates Kubernetes manifests with `kubeval` after writes |
| [`python-security-guard`](registry/hooks/python-security-guard) | PostToolUse | Runs Bandit on Python files to detect security vulnerabilities |
| [`dependency-audit`](registry/hooks/dependency-audit) | PostToolUse | Runs `npm audit` or `pip-audit` after `package.json` / `requirements.txt` changes |
| [`package-version-pin-guard`](registry/hooks/package-version-pin-guard) | PreToolUse | Warns when dependencies are added without pinned versions |
| [`license-header-guard`](registry/hooks/license-header-guard) | PostToolUse | Checks that new source files include the required license header |

---

### Developer Experience

| Hook | Event | Description |
|------|-------|-------------|
| [`session-summary`](registry/hooks/session-summary) | Stop | Writes a Markdown summary of everything Claude did during the session |
| [`token-usage-logger`](registry/hooks/token-usage-logger) | Stop | Logs token counts per session to `~/.hookpm/token-usage.jsonl` for cost tracking |
| [`test-on-edit`](registry/hooks/test-on-edit) | PostToolUse | Runs the test suite for the file Claude just edited using its detected test runner |

---

## Trust Signals

Every hook in the registry carries **trust signals** — computed automatically by static analysis when the hook is published.

| Signal | Meaning |
|--------|---------|
| `calls_external_api` | The hook's source makes outbound HTTP requests |
| `spawns_subprocess` | The hook runs child processes (linters, formatters, etc.) |
| `attestations` | Statements the author has explicitly attested to (e.g. `no-network-egress`, `no-filesystem-write`) |
| `rating_avg` / `rating_count` | Community star rating (1–5 stars) |
| **Health tier** | `healthy` / `warn` / `critical` — computed from rating + attestation completeness |

**Thresholds:**
- `healthy` — rating ≥ 4.0 and has attestations
- `warn` — rating ≥ 2.5 or has any attestations
- `critical` — rating < 2.5 and no attestations

`hookpm info <name>` shows all trust signals. `hookpm search` shows a health column so you can assess trustworthiness at a glance.

> Hooks with `calls_external_api: true` display an explicit warning at install time. You are always informed before installing a hook that phones home.

---

## How Hooks Work

### Event Types

Claude Code fires hook events at specific points in its execution:

| Event | When it fires | Common uses |
|-------|--------------|-------------|
| `PreToolUse` | Before Claude calls a tool | Block dangerous commands, validate inputs, check paths |
| `PostToolUse` | After a tool returns | Run formatters, linters, log activity, run tests |
| `Stop` | When Claude finishes responding | Write session summaries, log token usage |

Each hook specifies which event it listens to, and an optional `matcher` to narrow which tool calls trigger it:

```json
{
  "event": "PreToolUse",
  "matcher": { "tool_name": "^Bash$" }
}
```

Matchers use regular expressions matched against the tool name. Omit `matcher` to match all tool calls for that event.

### Exit Codes

Your hook's exit code tells Claude Code what to do next:

| Exit code | Meaning |
|-----------|---------|
| `0` | **Allow** — continue normally |
| `1` | **Warn** — print stderr as a warning, continue |
| `2` | **Block** — print stderr as an error, cancel the tool call |

Always design your hook to **fail open** (exit `0`) if something unexpected happens (e.g. a parse error in your code). This prevents your hook from accidentally blocking Claude when it shouldn't.

### The hook.json Schema

Every hook must have a `hook.json` at its root. Here is the full structure with annotations:

```jsonc
{
  // Identity
  "name": "my-hook",           // unique, kebab-case, globally unique in registry
  "version": "1.0.0",          // semver — bump for every published change
  "description": "...",        // one sentence, ≤120 chars, no trailing period
  "author": "your-github-username",
  "license": "MIT",

  // Behaviour
  "event": "PreToolUse",       // PreToolUse | PostToolUse | Stop
  "matcher": {
    "tool_name": "^Bash$"      // regex — omit to match all tools for this event
  },
  "handler": {
    "type": "command",
    "command": "python3 hook.py",  // relative to hook directory
    "async": false             // true = fire-and-forget (PostToolUse only, never blocks)
  },

  // Declared capabilities (be honest — static analysis will verify)
  "capabilities": ["block"],
  // Valid values: "block" | "modify-input" | "inject-context"
  //               "read-stdin" | "write-stdout" | "side-effects-only" | "approve"

  // Discoverability
  "tags": ["security", "bash"],

  // Permissions — declare everything your hook actually does
  "permissions": {
    "network": {
      "allowed": false,        // true if you make ANY outbound HTTP calls
      "domains": []            // list specific domains if allowed: true
    },
    "filesystem": {
      "read": [],              // glob patterns of paths you read
      "write": []              // glob patterns of paths you write
    },
    "env_vars": [],            // env vars your hook reads (not secrets — just names)
    "spawns_processes": false  // true if you subprocess.run() anything
  },

  // Requirements
  "requires": {
    "os": ["darwin", "linux"],
    "shell": ["bash", "zsh", "sh"]
  }
}
```

Full Zod schema: [`packages/schema/src/schema.ts`](packages/schema/src/schema.ts)

---

## Submitting a Hook

Hooks can be submitted two ways:

**Via `hookpm publish`** (recommended): Authenticate with GitHub and publish directly from your hook directory. No PR needed.

**Via Pull Request**: Open a PR that adds your hook directory under `registry/hooks/<your-hook-name>/`. The CI pipeline validates, analyses, and rebuilds the index automatically.

### Hook Requirements

Before publishing, verify your hook passes all of these:

- [ ] Has a valid `hook.json` — run `pnpm run validate-all` locally to check
- [ ] Has a working implementation file referenced by `handler.command`
- [ ] Reads the Claude event from `stdin` as JSON — never from `argv` or environment
- [ ] Uses exit codes correctly: `0` allow, `1` warn, `2` block
- [ ] Fails open: if your hook crashes or receives unexpected input, it exits `0`
- [ ] `description` is honest — says what it checks and what it does on failure
- [ ] `permissions` are complete and truthful:
  - `network.allowed: true` and `domains` listed if you make HTTP calls
  - `spawns_processes: true` if you call `subprocess.run()` or equivalent
  - All `env_vars` your hook reads are listed
- [ ] No hardcoded credentials, API keys, tokens, or personal data anywhere
- [ ] Has a `license` field (MIT strongly recommended)
- [ ] Does not bundle external binaries — rely on tools already installed on the user's machine

### Writing a Good hook.json

**Name conventions:**
- `-guard` suffix for hooks that block dangerous operations: `sql-injection-guard`
- `-on-<verb>` for reactive hooks: `format-on-write`, `test-on-edit`
- Noun for utility/logging hooks: `session-summary`, `token-usage-logger`

**Description:**
One sentence. Answer: what does it check, and what happens when it triggers?

> ✅ "Blocks `rm -rf`, `chmod 777`, `curl | sh`, and other high-risk shell patterns."
> ❌ "A guard for bash commands." (too vague)
> ❌ "This hook will watch for dangerous patterns in bash commands and block them if found." (too wordy)

**Capabilities — choose carefully:**

| Capability | Use when your hook... |
|------------|----------------------|
| `block` | Can exit `2` to cancel a tool call |
| `modify-input` | Rewrites the tool input JSON before the tool runs |
| `inject-context` | Adds text to Claude's context (stdout injection) |
| `side-effects-only` | Only runs side effects (logging, formatting) — never exits `2` |
| `approve` | Can approve operations requiring user confirmation |

### Security Review Process

All hooks in the registry pass through automated static analysis at publish time:

1. **Network scan** — detects `fetch`, `requests.get`, `urllib`, `curl`, `http.get` patterns → sets `calls_external_api`
2. **Subprocess scan** — detects `subprocess`, `child_process.exec`, `os.system`, `exec`, `spawn` → sets `spawns_subprocess`
3. **Permission consistency check** — if code uses network but `network.allowed: false`, publish is rejected
4. **Attestation check** — hooks with both network + subprocess access are flagged for manual review

These signals are stored in `index.json` and displayed to users via `hookpm info` and `hookpm search`. Hooks that call external APIs are never silently installed — users always see a warning.

---

## Architecture

```
hookpm install <name>
      │
      ▼
Registry API (Cloudflare Workers + Hono)
      │
      ├── GET /registry/index.json          ← hook list + trust signals
      ├── GET /registry/hooks/:name/hook.json
      └── GET /registry/hooks/:name/:archive.tar.gz
              │
              ▼
        Cloudflare R2 (zero egress fees)
              │
              ▼
    CLI: SHA-256 verify → extract → merge into ~/.claude/settings.json
```

**Publish flow:**

```
hookpm publish
    │
    ├── Validate hook.json (Zod schema)
    ├── Static analysis (calls_external_api, spawns_subprocess)
    ├── Conflict check (name + version already exists → reject)
    ├── Build .tar.gz archive
    └── POST /registry/hooks  (multipart, Authorization: Bearer <Clerk JWT>)
            │
            ├── JWT verified via Clerk JWKS
            ├── Upload archive + hook.json to R2
            └── Rebuild registry index.json
```

**Technology stack:**

| Layer | Technology | Reason |
|-------|-----------|--------|
| CLI | TypeScript + Node.js (npm package) | Cross-platform, familiar ecosystem |
| Registry API | [Hono](https://hono.dev/) on Cloudflare Workers | Edge-deployed, zero cold starts, generous free tier |
| Object storage | Cloudflare R2 | Zero egress fees — critical for a download-heavy registry |
| Ratings / downloads | Supabase (Postgres) | Persistent counters |
| Download events | Cloudflare Analytics Engine | Reliable hot-path tracking without Supabase dependency |
| Auth | [Clerk](https://clerk.com/) (GitHub OAuth) | Zero auth infrastructure to maintain |
| Schema validation | [Zod](https://zod.dev/) | Shared between CLI, API, and CI |

---

## Project Structure

```
hook-marketplace/
├── packages/
│   ├── cli/                  # hookpm CLI — published to npm
│   │   └── src/
│   │       ├── commands/     # install, remove, list, search, info, verify, publish, login, logout
│   │       ├── registry/     # registry client + disk cache
│   │       ├── settings/     # settings.json merge algorithm + lockfile
│   │       └── security/     # archive checksum verification
│   └── schema/               # hook.json Zod schema — shared between CLI and API
│       └── src/schema.ts     # source of truth for all hook validation
├── registry/
│   ├── hooks/                # one directory per hook: registry/hooks/<name>/
│   │   └── <hook-name>/
│   │       ├── hook.json     # manifest — must pass schema validation
│   │       ├── *.py / *.sh   # implementation files
│   │       └── *.tar.gz      # pre-built archive (generated by CI, committed)
│   ├── index.json            # generated index — do not edit manually
│   └── scripts/
│       ├── build-index.ts    # regenerates index.json from all hook directories
│       ├── build-archives.ts # creates .tar.gz archives for each hook
│       └── validate-all.ts   # validates every hook.json against the schema
├── api/                      # Hono API — deployed to Cloudflare Workers
│   └── src/
│       ├── index.ts          # all routes + scheduled cron (Supabase keep-alive)
│       ├── static-analysis.ts # network + subprocess detection for trust signals
│       └── trust.ts          # health tier computation
└── docs/
    └── design/               # design documents for every major subsystem
```

> **Note for contributors:** `docs/superpowers/` and `.claude/` contain internal development tooling and are not relevant to hook authors or CLI users. They are excluded from all published packages.

---

## Contributing

All contributions welcome — new hooks, CLI improvements, bug fixes, and documentation.

### Adding a Hook

The fastest path is `hookpm publish` from your hook directory. If you prefer a PR:

1. Create `registry/hooks/<your-hook-name>/hook.json` and your implementation
2. Run `pnpm run validate-all` — fix any schema errors
3. Run `pnpm run build-archives` — builds the archive
4. Run `pnpm run build-index` — rebuilds `index.json`
5. Open a PR — CI will validate everything

### Working on the CLI or API

```bash
# Install all dependencies
pnpm install

# Run all tests
pnpm --filter './packages/*' --filter './api' run test

# Typecheck everything
pnpm --filter './packages/*' --filter './api' run typecheck

# Validate registry
pnpm run validate-all

# Rebuild index after hook changes
pnpm run build-index
```

### Branch Model

```
main      ← protected, source of truth — PR only, no direct push
develop   ← integration branch — all feature PRs target here
feature/* ← feature branches → develop → main
```

---

## License

MIT — see [LICENSE](LICENSE).

Each hook in `registry/hooks/` carries its own `license` field in `hook.json`. All hooks in this registry are MIT unless otherwise stated.

---

<p align="center">
  Built for the Claude Code community.<br>
  <a href="https://github.com/nafistiham/hook-marketplace/issues">Report an issue</a> ·
  <a href="https://github.com/nafistiham/hook-marketplace/pulls">Open a PR</a>
</p>
