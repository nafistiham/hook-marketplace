# Hook Marketplace — Technical Specification

**Status:** Draft
**Audience:** Engineers building hookpm and the hook registry
**Date:** 2026-03-10
**Sources:** ws-technical.md (Claude Code hooks reference), ws-community.md (community usage patterns), hook-marketplace-research.md §5

---

## Table of Contents

1. [The `hook.json` Manifest Schema](#1-the-hookjson-manifest-schema)
2. [Registry Architecture](#2-registry-architecture)
3. [CLI Design: hookpm](#3-cli-design-hookpm)
4. [Security Model](#4-security-model)
5. [Hook Versioning and Update Flow](#5-hook-versioning-and-update-flow)
6. [settings.json Integration](#6-settingsjson-integration)
7. [Enterprise Private Registry](#7-enterprise-private-registry)

---

## 1. The `hook.json` Manifest Schema

Every distributable hook ships with a `hook.json` manifest at its root. The manifest is the contract between the hook author, the registry, the CLI, and the installing user. It describes what the hook does, what it needs, what it is allowed to do, and how much it can be trusted.

### 1.1 Full Schema

```json
{
  "$schema": "https://hookpm.dev/schema/hook.json/v1",
  "name": "string (lowercase, kebab-case, globally unique in registry)",
  "version": "string (semver: MAJOR.MINOR.PATCH)",
  "description": "string (one sentence, shown in search results)",
  "author": "string (GitHub handle or org)",
  "license": "string (SPDX identifier, e.g. MIT)",
  "homepage": "string (URL to repo or docs)",

  "event": "PreToolUse | PostToolUse | PostToolUseFailure | PermissionRequest | SessionStart | SessionEnd | UserPromptSubmit | Stop | SubagentStart | SubagentStop | TeammateIdle | TaskCompleted | Notification | InstructionsLoaded | ConfigChange | WorktreeCreate | WorktreeRemove | PreCompact",

  "matcher": {
    "tool_name": "string (regex applied to tool_name field in hook input)",
    "source": "string (regex applied to source field, for SessionStart/ConfigChange)"
  },

  "handler": {
    "type": "command | http | prompt | agent",

    "command": "string (shell command, relative to hook directory; type=command only)",
    "async": false,
    "timeout": 60,

    "url": "string (type=http only)",
    "headers": {
      "Authorization": "Bearer $HOOKPM_TOKEN"
    },
    "allowedEnvVars": ["HOOKPM_TOKEN"],

    "prompt": "string (type=prompt or agent; use $ARGUMENTS as placeholder for hook JSON)",
    "model": "string (optional, e.g. claude-haiku-4-5)"
  },

  "permissions": {
    "network": {
      "allowed": false,
      "domains": []
    },
    "filesystem": {
      "read": [],
      "write": []
    },
    "env_vars": [],
    "spawns_processes": false
  },

  "capabilities": [
    "block",
    "modify-input",
    "inject-context",
    "read-stdin",
    "write-stdout",
    "side-effects-only"
  ],

  "tags": ["string"],

  "requires": {
    "claude_code_version": ">=2.0.0",
    "os": ["darwin", "linux", "windows"],
    "shell": ["bash", "zsh", "sh"]
  },

  "security": {
    "sandbox_level": "none | static-analysis | verified | certified",
    "reviewed": false,
    "review_date": null,
    "signed": false,
    "signed_by": null,
    "signature": null
  }
}
```

### 1.2 Field Reference

**Identity fields** (`name`, `version`, `description`, `author`, `license`, `homepage`): standard package metadata. `name` must be globally unique in the registry, lowercase, kebab-case, 1-64 characters.

**`event`**: exactly one Claude Code hook event. A hook that needs to handle multiple events must be published as multiple packages or use a dispatcher script. One hook, one event — this keeps manifests auditable. The full event list is defined by the Claude Code hooks API; as of Claude Code 2.1, eighteen events exist (see table in §6).

**`matcher`**: optional filter applied before the hook fires. For `PreToolUse`, `PostToolUse`, `PermissionRequest`: use `tool_name` (regex against the `tool_name` field in hook input). For `SessionStart`, `ConfigChange`: use `source` (regex against the `source` field). If omitted, the hook fires on every occurrence of the event.

**`handler`**: exactly one handler. The `type` field determines which sub-fields are required:

| type | required fields | optional fields |
|---|---|---|
| `command` | `command` | `async`, `timeout` |
| `http` | `url` | `headers`, `allowedEnvVars`, `timeout` |
| `prompt` | `prompt` | `model`, `timeout` |
| `agent` | `prompt` | `model`, `timeout` |

`timeout` defaults: command = 600s, prompt = 30s, agent = 60s. Hook authors should set explicit timeouts.

**`permissions`**: declaration of what OS capabilities the hook implementation uses. This is self-reported — not enforced at runtime. The registry's static analysis job verifies these declarations against the implementation before merge. Consumers see this at install time, like Android app permissions.

- `network.allowed`: boolean. If `true`, `network.domains` must list the specific domains the hook contacts.
- `filesystem.read` / `filesystem.write`: arrays of path patterns (glob syntax). Use `["$CLAUDE_PROJECT_DIR/**"]` for project-scoped access.
- `env_vars`: array of environment variable names the hook reads.
- `spawns_processes`: boolean. Set `true` if the hook shells out to other programs beyond its own command.

**`capabilities`**: array of capability strings declaring what the hook can do to Claude's execution:

| capability | meaning |
|---|---|
| `block` | hook can exit 2 or return `permissionDecision: "deny"` to stop tool execution |
| `modify-input` | hook returns `updatedInput` to rewrite tool arguments before execution |
| `inject-context` | hook writes to stdout to inject text into Claude's context |
| `read-stdin` | hook reads the JSON payload from stdin |
| `write-stdout` | hook writes structured JSON to stdout |
| `side-effects-only` | hook runs for logging/notification/audit only; never blocks or modifies |
| `approve` | hook can grant permission without user dialog |

A hook that only logs should declare `["read-stdin", "side-effects-only"]`. A hook that blocks commands declares `["read-stdin", "write-stdout", "block"]`. The static analysis job flags mismatches between declared capabilities and detected behaviors.

**`tags`**: free-form searchable strings. Convention: use existing tags before inventing new ones. Common tags: `security`, `bash`, `guardrails`, `formatting`, `testing`, `observability`, `notifications`, `git`, `tdd`, `logging`, `compliance`, `network`.

**`requires`**: runtime compatibility. `claude_code_version` uses npm-style semver ranges. `os` restricts to specific platforms. `shell` restricts to shells the command hook is compatible with.

**`security`**: trust metadata populated by the registry, not the author:

| field | set by | meaning |
|---|---|---|
| `sandbox_level` | registry | `none` = unreviewed; `static-analysis` = passed CI scan; `verified` = human-reviewed; `certified` = signed + verified + enterprise-eligible |
| `reviewed` | registry | human reviewer has read the full source |
| `review_date` | registry | ISO 8601 date of last review |
| `signed` | registry | manifest is cryptographically signed |
| `signed_by` | registry | key ID of signing key |
| `signature` | registry | detached signature of the canonical manifest JSON |

Authors cannot set `security` fields. The registry signs manifests with its own key. Any `security` block present in an author-submitted `hook.json` is stripped and replaced during indexing.

### 1.3 Complete Example: Dangerous Command Blocker

This is the most common first hook in the community. It intercepts every Bash tool call before execution, checks the command against a blocklist of destructive patterns, and rejects matching commands with an explanation.

**Directory layout:**

```
hooks/bash-danger-guard/
├── hook.json
├── bash-danger-guard.py
└── README.md
```

**`hook.json`:**

```json
{
  "$schema": "https://hookpm.dev/schema/hook.json/v1",
  "name": "bash-danger-guard",
  "version": "1.3.0",
  "description": "Blocks dangerous bash commands (rm -rf, fork bombs, curl|sh pipes) before Claude executes them",
  "author": "hookpm-community",
  "license": "MIT",
  "homepage": "https://github.com/hookpm-community/bash-danger-guard",

  "event": "PreToolUse",

  "matcher": {
    "tool_name": "^Bash$"
  },

  "handler": {
    "type": "command",
    "command": "python3 bash-danger-guard.py",
    "timeout": 10
  },

  "permissions": {
    "network": {
      "allowed": false,
      "domains": []
    },
    "filesystem": {
      "read": [],
      "write": []
    },
    "env_vars": [],
    "spawns_processes": false
  },

  "capabilities": ["read-stdin", "write-stdout", "block"],

  "tags": ["security", "bash", "guardrails", "blocking"],

  "requires": {
    "claude_code_version": ">=2.0.0",
    "os": ["darwin", "linux"],
    "shell": ["bash", "zsh", "sh"]
  },

  "security": {
    "sandbox_level": "verified",
    "reviewed": true,
    "review_date": "2026-02-20",
    "signed": true,
    "signed_by": "hookpm-registry-2026A",
    "signature": "MEUCIQDx...base64...signature=="
  }
}
```

**`bash-danger-guard.py`:**

```python
#!/usr/bin/env python3
import json
import re
import sys

BLOCKED_PATTERNS = [
    (r"rm\s+-rf\s+[~/]", "Recursive delete of home or root directory"),
    (r"rm\s+-rf\s+\*", "Recursive delete of all files in current directory"),
    (r":\(\)\s*\{.*:\|:&\s*\}", "Fork bomb detected"),
    (r"curl\s+.*\|\s*(bash|sh|python|ruby|perl)", "Remote code execution pipe"),
    (r"wget\s+.*\|\s*(bash|sh|python|ruby|perl)", "Remote code execution pipe"),
    (r"base64\s+-d.*\|\s*(bash|sh)", "Encoded payload execution"),
    (r"dd\s+if=/dev/(zero|random|urandom)\s+of=/dev/(sd|nvme|disk)", "Disk overwrite"),
    (r"mkfs\.", "Filesystem format command"),
    (r">\s*/etc/passwd", "Overwrite /etc/passwd"),
    (r">\s*/etc/shadow", "Overwrite /etc/shadow"),
]

def main():
    try:
        payload = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        sys.exit(0)

    command = payload.get("tool_input", {}).get("command", "")

    for pattern, reason in BLOCKED_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE | re.DOTALL):
            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"bash-danger-guard: {reason}. Command: {command[:120]}"
                }
            }
            print(json.dumps(output))
            sys.exit(0)

    sys.exit(0)

if __name__ == "__main__":
    main()
```

The hook reads the Bash tool's `command` field from stdin, pattern-matches it, and returns a deny decision with a reason if any pattern matches. Exit 0 with the JSON output — never exit 2 when returning structured output. The reasons surface in Claude's context so it understands why execution was blocked and can propose an alternative.

---

## 2. Registry Architecture

### 2.1 Architecture Decision: Start GitHub-Backed, Migrate on Traction

The registry has two distinct phases. Phase 1 eliminates infrastructure cost and risk during the period when it is unclear whether the product has users. Phase 2 adds full-featured capabilities when the usage patterns are understood. Do not build Phase 2 before Phase 1 has proven demand. The migration path is defined now so it is not a surprise later.

### 2.2 Phase 1: GitHub-Backed Registry (Launch)

**Structure:**

```
hookpm-registry/                  (GitHub repo: github.com/hookpm/registry)
├── hooks/
│   ├── bash-danger-guard/
│   │   ├── hook.json             (manifest, author-submitted)
│   │   ├── bash-danger-guard.py  (implementation)
│   │   └── README.md
│   ├── auto-format-on-write/
│   │   ├── hook.json
│   │   └── format.sh
│   └── ...
├── index.json                    (generated by CI, never hand-edited)
├── .github/
│   └── workflows/
│       ├── validate-hook.yml     (runs on every PR)
│       └── rebuild-index.yml     (runs on every merge to main)
└── CONTRIBUTING.md
```

**`index.json` format:**

```json
{
  "version": "1.0",
  "schema": "https://hookpm.dev/schema/index.json/v1",
  "updated": "2026-03-10T12:00:00Z",
  "hooks": [
    {
      "name": "bash-danger-guard",
      "latest": "1.3.0",
      "versions": ["1.0.0", "1.1.0", "1.2.0", "1.3.0"],
      "description": "Blocks dangerous bash commands before Claude executes them",
      "author": "hookpm-community",
      "event": "PreToolUse",
      "tags": ["security", "bash", "guardrails"],
      "capabilities": ["read-stdin", "write-stdout", "block"],
      "security": {
        "sandbox_level": "verified",
        "reviewed": true
      },
      "downloads_total": 8431,
      "downloads_last_30d": 1204,
      "updated": "2026-02-20T00:00:00Z"
    }
  ]
}
```

**GitHub Actions workflows:**

`validate-hook.yml` (runs on every PR, blocks merge on failure):
1. Validates `hook.json` against the JSON schema.
2. Runs static analysis (see §4, Layer 2) against all implementation files.
3. Checks that `permissions` declarations are consistent with detected behaviors (network access, filesystem writes, process spawning).
4. Flags capability mismatches for human review.
5. Posts a summary as a PR comment.

`rebuild-index.yml` (runs on merge to main):
1. Parses all `hook.json` files in `hooks/` directory.
2. Strips and re-populates `security` fields (authors cannot self-certify).
3. Signs manifests for verified hooks using the registry signing key (stored as a GitHub secret).
4. Regenerates `index.json`.
5. Pushes `index.json` to a GitHub Pages branch and/or Cloudflare CDN.

**Tradeoffs:**

| property | assessment |
|---|---|
| infrastructure cost | zero — GitHub Actions + Pages are free at this scale |
| reliability | GitHub's uptime; acceptable for a new product |
| search capability | limited to tag filtering and substring match on the CLI side; no full-text search |
| install counts | requires a separate lightweight counter service (a single Cloudflare Worker + KV store is sufficient) |
| submission friction | standard GitHub PR flow — familiar for developers, audit trail built-in |
| vulnerability response | a malicious hook requires a PR merge, which requires a reviewer; the attack surface is the PR review process |

Phase 1 is the right architecture until the registry has more than ~1,000 hooks or the search limitations become a real user complaint. Both thresholds are 12-18 months away.

### 2.3 Phase 2: Hosted Registry (Post-Traction)

Phase 2 adds a REST API, a proper database, and full-text search. The GitHub repo remains the source of truth for the public registry — the hosted API reads from it rather than replacing it.

**REST API:**

```
GET  /api/v1/hooks                     List hooks (paginated, filterable)
GET  /api/v1/hooks/:name               Get hook metadata + latest manifest
GET  /api/v1/hooks/:name/:version      Get hook metadata for specific version
GET  /api/v1/hooks/:name/:version/download   Download hook archive
POST /api/v1/hooks                     Submit hook (requires auth)
GET  /api/v1/search?q=&tags=&event=   Full-text search
GET  /api/v1/stats/:name               Install stats for a hook
POST /api/v1/installs/:name            Record an install (anonymous, used for download counts)
```

**Infrastructure:**

- **Metadata store**: SQLite (sufficient for <100k hooks) or Postgres (if multi-region is needed). Schema: `hooks`, `hook_versions`, `hook_tags`, `installs` tables.
- **File storage**: object storage (S3-compatible) for hook archives. Each version is a `.tar.gz` of the hook directory. The manifest is also stored separately for fast metadata reads.
- **Search index**: Meilisearch or Typesense running alongside the API. Indexes `name`, `description`, `tags`, `author`, `capabilities`. Full-text is a meaningful improvement over Phase 1's substring search.
- **Authentication**: GitHub OAuth for hook submission and author dashboard. API keys for enterprise registry automation.
- **CDN**: Cloudflare in front of the file storage. Hook archives are immutable once published, making CDN caching trivial.

**Tradeoffs vs Phase 1:**

| property | Phase 1 | Phase 2 |
|---|---|---|
| full-text search | no | yes |
| versioned downloads | via git tags | via object storage |
| real-time install counts | separate counter service | native |
| authenticated submission | GitHub PR | API key + GitHub OAuth |
| private hooks | not supported | supported (enterprise tier) |
| infrastructure cost | ~$0/month | ~$200-500/month (hosting + CDN) |
| operational complexity | GitHub manages it | your team manages it |

**Migration path from Phase 1 to Phase 2**: the `index.json` format is stable across both phases. The CLI's `--registry` flag allows pointing at any registry URL. Phase 2 launches as an opt-in alternative while Phase 1 remains the default. When Phase 2 is stable, the CLI default switches. There is no flag day where all users must upgrade.

---

## 3. CLI Design: hookpm

### 3.1 Design Principles

`hookpm` is to Claude Code hooks what `npm` is to Node.js packages, with one critical difference: installing a hook modifies `settings.json`, which directly controls what code runs during every Claude session. This is not like installing a library. The CLI must make the security implications visible at every install, never hide version changes, and never auto-update silently.

The CLI is a single binary, written in Go or TypeScript. Go is recommended for distribution simplicity (single static binary, no runtime dependency). It reads from `~/.hookpm/config.json` for global configuration and `.hookpm.json` in the project directory for project-level overrides.

### 3.2 Command Reference

#### `hookpm install <name>[@version]`

Install a hook and write it to `settings.json`.

```bash
# Install latest version
hookpm install bash-danger-guard

# Install specific version
hookpm install bash-danger-guard@1.2.0

# Install to global settings (~/.claude/settings.json)
hookpm install bash-danger-guard --global

# Install from GitHub directly (bypasses registry, for pre-submission testing)
hookpm install github:hookpm-community/bash-danger-guard

# Install from local path (for development)
hookpm install ./my-hook/

# Install with explicit trust override (not recommended, shown in output)
hookpm install some-hook --trust-unverified
```

Flags: `--global` (write to `~/.claude/settings.json` instead of `.claude/settings.json`), `--dry-run` (show what would change without writing), `--trust-unverified` (skip the verification warning prompt).

#### `hookpm remove <name>`

Remove a hook from `settings.json` and delete its local files.

```bash
hookpm remove bash-danger-guard

# Remove from global settings
hookpm remove bash-danger-guard --global
```

The remove command does a reverse of the install: reads `settings.json`, finds the hook's entry in the `hooks` block (matched by the hook name stored in `hookpm.lock`), removes it, and writes back. It then removes the hook's files from `~/.hookpm/hooks/<name>@<version>/`.

#### `hookpm list`

List all installed hooks for the current context (project + global).

```bash
hookpm list

# Example output:
# PROJECT (.claude/settings.json):
#   bash-danger-guard   1.3.0   PreToolUse   [VERIFIED] security, bash, guardrails
#   auto-format-write   2.1.0   PostToolUse  [VERIFIED] formatting
#
# GLOBAL (~/.claude/settings.json):
#   desktop-notify      1.0.4   Stop         [unverified] notifications
```

Flags: `--json` (output as JSON), `--global` (list only global hooks), `--project` (list only project hooks).

#### `hookpm search <query>`

Search the registry by text, tags, or event type.

```bash
hookpm search security
hookpm search --tag formatting
hookpm search --event PreToolUse
hookpm search --event PreToolUse --tag security
hookpm search --verified-only

# Example output:
# bash-danger-guard   1.3.0   [VERIFIED]   Blocks dangerous bash commands
#   tags: security, bash, guardrails | installs: 8,431
# secret-guard        2.0.1   [VERIFIED]   Prevents .env and credential files from being read
#   tags: security, secrets | installs: 6,102
# prompt-injection-guard 1.1.0 [static-analysis] Scans tool inputs for injection patterns
#   tags: security, prompt-injection | installs: 1,887
```

#### `hookpm update [name]`

Update installed hooks to their latest compatible versions.

```bash
# Update all installed hooks (respects semver ranges in lockfile)
hookpm update

# Update a specific hook
hookpm update bash-danger-guard

# Update to latest major version (opt-in, may have breaking changes)
hookpm update bash-danger-guard --major

# Show what would be updated without applying
hookpm update --dry-run
```

`hookpm update` without `--major` will not cross a major version boundary. A hook pinned at `^1.2.0` updates to `1.x.y` but never to `2.0.0`. This is the correct default — major versions of a hook may change its behavior contract.

#### `hookpm info <name>`

Show full metadata for a hook before installing it.

```bash
hookpm info bash-danger-guard

# Example output:
# bash-danger-guard @ 1.3.0
# Blocks dangerous bash commands (rm -rf, fork bombs, curl|sh pipes)
#
# Author:   hookpm-community
# License:  MIT
# Event:    PreToolUse (matcher: tool_name = /^Bash$/)
# Handler:  command (python3 bash-danger-guard.py, timeout: 10s)
#
# Security: VERIFIED (reviewed 2026-02-20, signed)
# Sandbox:  no runtime sandbox; static analysis passed
#
# Permissions:
#   network:    none
#   filesystem: none
#   env vars:   none
#   processes:  none
#
# Capabilities: read-stdin, write-stdout, block
#
# Tags: security, bash, guardrails, blocking
# Installs: 8,431 total / 1,204 last 30 days
# Homepage: https://github.com/hookpm-community/bash-danger-guard
```

#### `hookpm publish`

Submit a hook to the registry. Requires authentication.

```bash
# Authenticate first (GitHub OAuth)
hookpm auth login

# Submit hook in current directory
hookpm publish

# Submit from specific path
hookpm publish ./my-hook/

# Submit a new version (bumps version in hook.json)
hookpm publish --bump patch
hookpm publish --bump minor
hookpm publish --bump major
```

`hookpm publish` validates the `hook.json` against the schema, runs the static analysis checks locally, packages the hook directory as a tarball, and opens a PR to the registry repository (Phase 1) or calls the submission API (Phase 2). It does not publish directly — all submissions go through the review queue.

#### `hookpm verify <name>`

Check the cryptographic signature of an installed hook's manifest.

```bash
hookpm verify bash-danger-guard

# Example output (verified):
# bash-danger-guard @ 1.3.0 — signature VALID
#   Signed by: hookpm-registry-2026A (trusted)
#   Manifest hash: sha256:a3f8c1...
#   Signature verified against public key on 2026-03-10

# Example output (failed):
# bash-danger-guard @ 1.3.0 — signature INVALID
#   WARNING: manifest has been modified since signing
#   Expected hash: sha256:a3f8c1...
#   Actual hash:   sha256:d91b44...
#   DO NOT USE THIS HOOK. Run: hookpm remove bash-danger-guard
```

### 3.3 The Hard Part: How `install` Manipulates `settings.json`

This is the most failure-prone operation in the CLI. `settings.json` is a file that users also edit manually. The CLI must merge without clobbering.

**Claude Code's `settings.json` hooks structure:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 /some/existing-hook.py"
          }
        ]
      }
    ]
  }
}
```

The `hooks` top-level key maps event names to arrays. Each element is a matcher object: `{ "matcher": { "tool_name": "..." }, "hooks": [ { "type": "...", ... } ] }`. If there is no matcher filter, the element is just `{ "hooks": [...] }`.

**Before installing `bash-danger-guard` (existing settings.json):**

```json
{
  "model": "claude-opus-4-5",
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 /home/user/.hookpm/hooks/auto-format-write@2.1.0/format.py"
          }
        ]
      }
    ]
  }
}
```

**After installing `bash-danger-guard`:**

```json
{
  "model": "claude-opus-4-5",
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 /home/user/.hookpm/hooks/auto-format-write@2.1.0/format.py"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": {
          "tool_name": "^Bash$"
        },
        "hooks": [
          {
            "type": "command",
            "command": "python3 /home/user/.hookpm/hooks/bash-danger-guard@1.3.0/bash-danger-guard.py"
          }
        ]
      }
    ]
  }
}
```

The `model` key and the existing `PostToolUse` entry are untouched. Only the `PreToolUse` array is modified, and only by appending a new entry.

**Merge algorithm (pseudocode):**

```
function install(manifest, settings_path):
    # 1. Read settings.json (parse as JSON, preserve formatting via json-stable-stringify or similar)
    settings = read_json(settings_path)

    # 2. Ensure top-level hooks key exists
    if settings["hooks"] is null:
        settings["hooks"] = {}

    # 3. Ensure event array exists
    event = manifest["event"]
    if settings["hooks"][event] is null:
        settings["hooks"][event] = []

    # 4. Build the new entry from the manifest
    entry = {}
    if manifest["matcher"] is not null:
        entry["matcher"] = manifest["matcher"]
    entry["hooks"] = [build_handler_config(manifest["handler"], installed_path)]

    # 5. Check for an existing entry installed by hookpm (via lockfile)
    lock = read_lockfile(settings_path)
    existing_entry_index = lock.find_entry(manifest["name"], event)

    if existing_entry_index is not null:
        # Replace the existing entry (upgrade/reinstall)
        settings["hooks"][event][existing_entry_index] = entry
    else:
        # Append new entry (fresh install)
        settings["hooks"][event].append(entry)

    # 6. Write settings.json back (atomic write: write to temp file, then rename)
    write_json_atomic(settings_path, settings)

    # 7. Update lockfile
    lock.record(manifest["name"], manifest["version"], event, len(settings["hooks"][event]) - 1)
    write_lockfile(settings_path, lock)

function build_handler_config(handler, installed_path):
    base = { "type": handler["type"] }
    if handler["type"] == "command":
        base["command"] = join_path(installed_path, handler["command"])
        if handler["timeout"] is set:
            base["timeout"] = handler["timeout"]
        if handler["async"] is set:
            base["async"] = handler["async"]
    elif handler["type"] == "http":
        base["url"] = handler["url"]
        if handler["headers"] is set:
            base["headers"] = handler["headers"]
        if handler["allowedEnvVars"] is set:
            base["allowedEnvVars"] = handler["allowedEnvVars"]
    elif handler["type"] in ["prompt", "agent"]:
        base["prompt"] = handler["prompt"]
        if handler["model"] is set:
            base["model"] = handler["model"]
    return base
```

**Key decisions in this algorithm:**

- **Atomic write**: write to a temp file and rename, never write directly. If the process is interrupted mid-write, the existing `settings.json` is intact.
- **Lockfile tracks array index**: the lockfile records which array position belongs to each hookpm-managed hook. This is how `remove` and `update` find and replace existing entries without affecting user-added entries in the same array.
- **Append, never replace the event array**: user-added entries at the top of a `PreToolUse` array should remain there. hookpm entries go at the end by default. The `--prepend` flag (not shown above) allows installing a hook before existing entries — useful for security hooks that must run first.
- **Preserve JSON formatting**: read with the system JSON parser, write with json-stable-stringify or equivalent that preserves key ordering as much as possible. Do not reformat the file. Users who hand-edit `settings.json` should not see their comments removed (Claude Code's `settings.json` does not support JSON5 comments, but whitespace should be preserved).

---

## 4. Security Model

The security model is grounded in two real CVEs. CVE-2025-59536 demonstrated that a malicious CLAUDE.md in a shared repository can define hooks that execute on every collaborator's machine. CVE-2026-21852 showed that hooks can be used to exfiltrate API tokens via HTTP calls disguised as legitimate logging. The threat model is not theoretical.

The four-layer model below addresses both threat vectors without requiring a runtime sandbox (which Claude Code does not currently provide).

### 4.1 Layer 1: Capability Declarations

Every hook manifest declares what it can do via the `capabilities` and `permissions` fields. This layer is self-reported and not enforced at runtime. Its purpose is threefold:

1. **User visibility at install time**: `hookpm install` shows the capability summary before writing to `settings.json`. Users see that a hook claims to need network access before they grant it.

2. **Static analysis baseline**: Layer 2's CI job uses the capability declarations as the expected behavior. A hook claiming `"network": { "allowed": false }` that contains `curl` commands is immediately flagged.

3. **Audit trail**: verified hooks have their capabilities reviewed by a human. The reviewed `hook.json` is signed. Any post-review modification invalidates the signature and Layer 3 catches it.

The CLI output at install time for an unverified hook:

```
Installing bash-danger-guard @ 1.3.0

Status: VERIFIED (reviewed 2026-02-20)

Capabilities:
  - Reads tool input from stdin
  - Can BLOCK tool execution (PreToolUse)
  - Writes decision JSON to stdout

Permissions:
  - Network access: NONE
  - Filesystem access: NONE
  - Environment variables: NONE
  - Spawns processes: NO

This hook will be added to .claude/settings.json for PreToolUse events
matching tool_name: /^Bash$/

Proceed? [Y/n]
```

For an unverified hook, the output leads with a warning:

```
Installing some-unverified-hook @ 1.0.0

WARNING: This hook has not been reviewed or verified.
The capability declarations below are self-reported by the author
and have not been independently confirmed.

Capabilities (UNVERIFIED):
  - Reads tool input from stdin
  - Can BLOCK tool execution
  - Claims network access: NO
    ^ Not confirmed — hook may make network calls

Install unverified hook? [y/N]  (default: No)
```

The default for unverified installs is No. Users must affirmatively choose to install unverified hooks.

### 4.2 Layer 2: Signature Verification

Certified hooks are signed with the registry's Ed25519 private key (using minisign). The signing key is held by the registry operator and rotated annually. The corresponding public key is distributed with the hookpm binary.

**Signing flow (registry side, runs after human review):**

```
1. Reviewer approves hook in the review queue
2. CI job:
   a. Strips author-submitted security fields from hook.json
   b. Sets security.reviewed = true, security.review_date = today
   c. Sets security.sandbox_level = "verified"
   d. Canonicalizes the manifest JSON (sorted keys, no whitespace)
   e. Computes SHA-256 hash of the canonical JSON
   f. Signs the hash with the registry private key (minisign)
   g. Stores signature as security.signature
   h. Sets security.signed = true, security.signed_by = key_id
3. Signed manifest is committed to the registry repo
4. index.json is rebuilt
```

**Verification flow (hookpm install, Layer 3 check):**

```
1. hookpm downloads the manifest from registry
2. Extracts security.signature and security.signed_by
3. Looks up the public key for signed_by in the embedded key store
4. Canonicalizes the manifest JSON (same algorithm as signing)
5. Verifies the signature against the canonical JSON + public key
6. If verification fails: abort install, print error, suggest reporting
7. If verification passes: proceed to install
```

The CLI ships with the registry public key embedded. Key rotation: when the registry rotates keys, a new CLI version is required to trust new signatures. Old signatures made with the previous key remain valid against the old key, which is retired but kept in the CLI's key store for a transition period (12 months).

**What this prevents**: a modified hook archive in transit (MITM or compromised CDN) is caught because the manifest hash no longer matches the signature. A modified registry entry (compromised GitHub repo) is caught the same way, provided the signing key was not also compromised.

**What this does not prevent**: a hook that behaves maliciously but has not been modified since review. This is why Layer 4 (manual review) is the actual trust foundation. Signing proves integrity; review proves safety.

### 4.3 Layer 3: Sandbox Declarations and Install-Time Review

Hooks declare their required OS permissions explicitly. The CLI presents these to the user at install time (shown above in Layer 1). In Phase 2, users can set a policy in their hookpm config that auto-rejects hooks claiming certain capabilities:

```json
{
  "install_policy": {
    "require_verified": false,
    "block_capabilities": ["network_access"],
    "warn_capabilities": ["spawns_processes", "filesystem_write"],
    "auto_approve_verified": true
  }
}
```

This is the Android permissions model applied to hooks: users see a manifest of what the hook claims before they authorize it. The CLI enforces the declared permissions as a policy filter, not as a runtime sandbox.

### 4.4 Layer 4: Security Review Process

The security review process is the trust foundation for the "verified" badge. It is a manual process with defined steps.

**Review checklist for certified hooks:**

```
[ ] hook.json schema validation passes
[ ] version is semver-valid and higher than previous version
[ ] event and matcher are consistent with description
[ ] capabilities match declared behavior:
    - if "block" declared: hook uses exit 2 or permissionDecision: "deny"
    - if "modify-input" declared: hook returns updatedInput
    - if "inject-context" declared: hook writes plain text to stdout on exit 0
    - if "side-effects-only" declared: hook never returns block/deny decisions
[ ] permissions.network.allowed = false: no curl/wget/fetch/requests in source
[ ] permissions.filesystem.read/write: paths declared match paths accessed in source
[ ] permissions.env_vars: all accessed env vars are declared
[ ] Static analysis passed (Layer 2 CI job output reviewed)
[ ] No eval, base64-d-pipe, or obfuscated execution patterns
[ ] No API key or token exfiltration patterns (sending stdin content to external URLs)
[ ] No reads of ~/.ssh/, ~/.aws/, ~/.config/gcloud/, /etc/passwd, /etc/shadow
[ ] Handler command path is relative (not absolute system path)
[ ] Timeout is set to a reasonable value for the declared purpose
[ ] README documents what the hook does and what it does not do
[ ] Test cases or example inputs included (strongly recommended)
```

**CVE threat model checklist** (directly from CVE-2025-59536 and CVE-2026-21852 analysis):

```
[ ] Hook does not read environment variables and POST them to an external URL
[ ] Hook does not exfiltrate transcript_path contents
[ ] Hook does not read ~/.claude/ directory
[ ] HTTP hook URLs are to specific known domains (not user-controlled or dynamic)
[ ] Hook does not install or modify other hooks
[ ] Hook does not modify settings.json
[ ] Hook does not execute code received from the tool input (no eval-of-stdin patterns)
```

A hook that fails any CVE checklist item is rejected and the reason is documented on the review record. Authors can resubmit after addressing the finding.

---

## 5. Hook Versioning and Update Flow

### 5.1 Semantic Versioning

All hooks use semantic versioning (semver 2.0.0). The contract:

- **PATCH** (`1.2.0` → `1.2.1`): bug fix, tighter pattern matching, performance improvement. Does not change what the hook blocks or allows. `hookpm update` applies automatically.
- **MINOR** (`1.2.0` → `1.3.0`): new patterns added, new configuration option, expanded capabilities. Existing behavior preserved. `hookpm update` applies automatically.
- **MAJOR** (`1.x.y` → `2.0.0`): breaking change in hook behavior, change to `settings.json` configuration structure, removal of capability. Requires `hookpm update --major` to apply.

Breaking change examples for hooks:
- Changing the `matcher.tool_name` pattern to cover new tools (could block things that previously passed).
- Changing the `event` field (requires reinstall with different `settings.json` placement).
- Removing a declared capability that users have come to rely on.
- Changing the expected format of hook-specific environment variables.

### 5.2 The Lockfile

The lockfile (`hookpm.lock` in the project directory, `~/.hookpm/global.lock` for global installs) records the exact installed state.

```json
{
  "version": "1",
  "generated": "2026-03-10T12:00:00Z",
  "registry": "https://hookpm.dev",
  "hooks": {
    "bash-danger-guard": {
      "version": "1.3.0",
      "resolved": "https://hookpm.dev/hooks/bash-danger-guard/1.3.0/bash-danger-guard-1.3.0.tar.gz",
      "integrity": "sha256-a3f8c1d9e4b2f07a8c3e5d1b9f4a6c2e8d0b7f3a1c5e9d2b6f0a4c8e3d7b1f5",
      "event": "PreToolUse",
      "settings_index": 0,
      "installed": "2026-03-10T11:45:00Z",
      "range": "^1.3.0"
    },
    "auto-format-write": {
      "version": "2.1.0",
      "resolved": "https://hookpm.dev/hooks/auto-format-write/2.1.0/auto-format-write-2.1.0.tar.gz",
      "integrity": "sha256-b4d1e2f8c0a7b3e9d5f1c4a8e2d0b6f4a2c8e0d4b8f2a6c0e4d8b2f6a0c4e8d2",
      "event": "PostToolUse",
      "settings_index": 0,
      "installed": "2026-02-15T09:22:00Z",
      "range": "^2.1.0"
    }
  }
}
```

`settings_index` is the array position in `settings.json`'s event array. This is how `remove` and `update` locate the hook's entry without parsing the entire settings file.

`integrity` is the SHA-256 hash of the downloaded archive. `hookpm verify` recomputes this and compares.

`range` is the semver range that `hookpm update` respects. Default is `^INSTALLED_VERSION` (compatible minor/patch updates). Users can manually edit this to `>=1.0.0 <3.0.0` for broader update tolerance.

The lockfile is committed to version control for project-level installs. This ensures all team members running `hookpm install` (with no arguments, which reads the lockfile) get exactly the same hook versions.

### 5.3 Update Flow

```
hookpm update:

1. Read lockfile
2. For each installed hook:
   a. Query registry for versions newer than installed version
   b. Filter to versions satisfying the range in lockfile
   c. If --major flag present, expand range to include major bumps
3. Display pending updates:
   bash-danger-guard   1.3.0 → 1.4.0   (patch, auto)
   auto-format-write   2.1.0 → 2.2.0   (minor, auto)
   secret-guard        1.0.0 → 2.0.0   (MAJOR — run hookpm update secret-guard --major)
4. Prompt confirmation: "Update 2 hooks? [Y/n]"
5. For each approved update:
   a. Download new archive, verify integrity
   b. Verify signature (Layer 2)
   c. Diff old and new settings.json block (show user what changes)
   d. Install new version files to ~/.hookpm/hooks/<name>@<new_version>/
   e. Update settings.json entry at stored index
   f. Update lockfile version and integrity
6. Print summary
```

Auto-update (running on a schedule without prompt) is not supported. Updates to hook code that runs shell commands require explicit user confirmation. A CI pipeline that runs `hookpm update --yes` for automated updates is an acceptable pattern for teams that want it, but the CLI does not push for this.

---

## 6. settings.json Integration

This section expands on §3.3 with the complete merge mechanics.

### 6.1 Claude Code hooks Structure Reference

Claude Code's `settings.json` `hooks` key follows this structure:

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": {
          "tool_name": "<regex>",
          "source": "<regex>"
        },
        "hooks": [
          {
            "type": "command | http | prompt | agent",
            "command": "<shell command>",
            "timeout": 60,
            "async": false
          }
        ]
      }
    ]
  }
}
```

The outer array (per event) is a list of "matcher groups". Each group has an optional `matcher` and a `hooks` array of handler configs. All handlers in a group fire for inputs matching the group's matcher. Multiple groups for the same event all fire if their matchers match.

`hookpm` creates one matcher group per installed hook. This keeps hookpm-managed entries separable from user-managed entries in the same event array.

### 6.2 Full Before/After for a PreToolUse Hook

**Before** (user has one manually added PostToolUse hook):

```json
{
  "model": "claude-opus-4-5",
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/my-custom-logger.sh"
          }
        ]
      }
    ]
  }
}
```

**After** `hookpm install bash-danger-guard`:

```json
{
  "model": "claude-opus-4-5",
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/my-custom-logger.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": {
          "tool_name": "^Bash$"
        },
        "hooks": [
          {
            "type": "command",
            "command": "python3 /Users/user/.hookpm/hooks/bash-danger-guard@1.3.0/bash-danger-guard.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**After** additionally running `hookpm install secret-guard` (also a PreToolUse hook, different matcher):

```json
{
  "model": "claude-opus-4-5",
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/my-custom-logger.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": {
          "tool_name": "^Bash$"
        },
        "hooks": [
          {
            "type": "command",
            "command": "python3 /Users/user/.hookpm/hooks/bash-danger-guard@1.3.0/bash-danger-guard.py",
            "timeout": 10
          }
        ]
      },
      {
        "matcher": {
          "tool_name": "^(Read|Write|Edit)$"
        },
        "hooks": [
          {
            "type": "command",
            "command": "python3 /Users/user/.hookpm/hooks/secret-guard@2.0.1/secret-guard.py",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

Each hookpm-installed hook gets its own matcher group. The user's manually added logger remains untouched.

### 6.3 Conflict Detection

A conflict occurs when two installed hooks have overlapping matchers for the same event and both can block. `hookpm install` warns when this is detected:

```
WARNING: bash-danger-guard and prompt-injection-guard both match PreToolUse
with tool_name matching Bash. Both can block execution. They will both run
on every Bash call; the first to deny will block. Order: bash-danger-guard
runs first (installed first).

If this is not what you want, use: hookpm reorder
```

`hookpm reorder` is an interactive command to change the order of entries in an event array. It is the only command that modifies existing entries rather than appending.

---

## 7. Enterprise Private Registry

### 7.1 What Enterprises Need

Enterprises cannot use the public registry directly for four reasons:
1. They need to approve which hooks their developers can install (allowlist/denylist policy).
2. They need hooks that contain internal tooling configurations (secret-bearing config) to never be public.
3. They operate in air-gapped or restricted-network environments.
4. They need an audit log of what code runs on developer machines for compliance.

The enterprise private registry is a self-hosted service that speaks the same API as the public registry. The `hookpm` CLI's `--registry` flag points at it.

### 7.2 Docker Image

The registry service is distributed as a single Docker image.

```
docker pull hookpm/registry-enterprise:latest
```

**Docker Compose deployment (minimal):**

```yaml
version: "3.8"
services:
  registry:
    image: hookpm/registry-enterprise:latest
    ports:
      - "8080:8080"
    environment:
      HOOKPM_DB_PATH: /data/registry.db
      HOOKPM_STORAGE_BACKEND: local
      HOOKPM_STORAGE_PATH: /data/hooks
      HOOKPM_AUTH_PROVIDER: saml
      HOOKPM_SAML_METADATA_URL: https://your-idp.example.com/saml/metadata
      HOOKPM_SIGNING_KEY_PATH: /secrets/signing.key
      HOOKPM_PUBLIC_REGISTRY_MIRROR: https://hookpm.dev  # optional, for mirroring public hooks
    volumes:
      - registry-data:/data
      - ./secrets:/secrets:ro
    restart: unless-stopped

volumes:
  registry-data:
```

**Environment variables:**

| variable | required | description |
|---|---|---|
| `HOOKPM_DB_PATH` | yes | path to SQLite database file (or Postgres URL: `postgres://...`) |
| `HOOKPM_STORAGE_BACKEND` | yes | `local` or `s3` |
| `HOOKPM_STORAGE_PATH` | yes (local) | filesystem path for hook archives |
| `HOOKPM_S3_BUCKET` | yes (s3) | S3 bucket name |
| `HOOKPM_AUTH_PROVIDER` | yes | `saml`, `oidc`, or `none` (internal only) |
| `HOOKPM_SAML_METADATA_URL` | yes (saml) | IdP metadata URL |
| `HOOKPM_OIDC_ISSUER` | yes (oidc) | OIDC issuer URL |
| `HOOKPM_SIGNING_KEY_PATH` | yes | path to Ed25519 private key (PEM format) |
| `HOOKPM_PUBLIC_REGISTRY_MIRROR` | no | public registry URL to mirror from |
| `HOOKPM_AIR_GAPPED` | no | set to `true` to disable all external calls |
| `HOOKPM_AUDIT_LOG_PATH` | no | filesystem path for JSONL audit log (in addition to DB) |
| `HOOKPM_ORG_NAMESPACE` | no | default namespace prefix, e.g. `acme` |

### 7.3 SSO/SAML Integration

The registry uses SAML 2.0 (via the `crewjam/saml` Go library) or OIDC (via standard `golang.org/x/oauth2`). SAML is recommended for enterprises with Okta, Azure AD, or Ping Identity. OIDC is simpler for Google Workspace or Keycloak.

**SAML flow:**
1. User runs `hookpm auth login --registry https://registry.acme.com`
2. CLI opens browser to `https://registry.acme.com/auth/saml/init`
3. Registry redirects to IdP
4. User authenticates with IdP
5. IdP posts SAML assertion back to registry
6. Registry validates assertion, extracts `email` and `groups` attributes
7. Registry issues a JWT access token (24h expiry) + refresh token (90d)
8. CLI stores tokens in OS keychain (macOS: Keychain, Linux: libsecret, Windows: Credential Manager)

**Group-to-role mapping** (configured in registry admin UI):
```json
{
  "role_mappings": [
    { "saml_group": "engineering", "role": "developer" },
    { "saml_group": "security-team", "role": "admin" },
    { "saml_group": "contractors", "role": "read-only" }
  ]
}
```

Roles: `read-only` (search/install only), `developer` (read-only + submit internal hooks), `admin` (full access including policy management and audit logs).

### 7.4 Audit Log Schema

Every install, search, update, and publish action is logged. The audit log is stored in the database and optionally streamed to a JSONL file.

```json
{
  "id": "aud_01j9x8k2p4f3g7h1m5n9q3r7t0",
  "timestamp": "2026-03-10T14:23:17.412Z",
  "actor": {
    "user_id": "usr_okta_jsmith@acme.com",
    "email": "jsmith@acme.com",
    "groups": ["engineering"],
    "client_ip": "10.0.1.45",
    "user_agent": "hookpm/1.0.0 darwin/arm64"
  },
  "action": "install",
  "resource": {
    "hook_name": "bash-danger-guard",
    "hook_version": "1.3.0",
    "namespace": "public",
    "settings_target": "project",
    "project_path": "/Users/jsmith/acme-monorepo"
  },
  "outcome": "success",
  "policy_checks": [
    { "policy": "allowlist", "result": "pass", "reason": "bash-danger-guard is on org allowlist" }
  ],
  "signature_verification": "pass"
}
```

Audit log fields for the `install` action:
- `action`: `install`, `remove`, `update`, `publish`, `search`, `login`, `policy_change`
- `outcome`: `success`, `blocked_by_policy`, `signature_invalid`, `auth_failed`
- `policy_checks`: array of policy checks that ran and their results
- `signature_verification`: `pass`, `fail`, `skipped` (unverified hook)

The audit log API endpoint (`GET /api/v1/audit?from=&to=&actor=&action=`) is accessible to `admin` role users. It exports as JSONL or CSV for SIEM integration.

### 7.5 Hook Namespace Isolation

The enterprise registry supports namespaced hooks. Public registry hooks are under the implicit `public/` namespace. Internal hooks use the org namespace.

**Namespace syntax** in hookpm commands:
```bash
# Install a public hook
hookpm install bash-danger-guard --registry https://registry.acme.com

# Install an internal org hook
hookpm install @acme/deploy-guard --registry https://registry.acme.com

# Team-scoped hook
hookpm install @acme/backend-team/db-migration-guard --registry https://registry.acme.com
```

**Namespace directory structure in the private registry:**
```
namespaces/
├── public/                   (mirrored from hookpm.dev, read-only)
│   └── bash-danger-guard/
│       ├── 1.3.0/
│       └── ...
├── acme/                     (org-level internal hooks)
│   ├── deploy-guard/
│   └── secrets-scanner/
└── acme/backend-team/        (team-scoped hooks)
    └── db-migration-guard/
```

Namespace isolation means a `developer` role user can see and install from `public/` and their team's namespace but not from other teams' namespaces. Namespace visibility is controlled by group membership from the IdP.

### 7.6 Policy Enforcement

Admins configure org-wide hook policies:

```json
{
  "policies": {
    "allowlist_mode": false,
    "allowlisted_hooks": [],
    "denylisted_hooks": ["some-problematic-hook"],
    "require_verified_for_public": true,
    "block_capabilities": ["network_access"],
    "max_hook_timeout": 30,
    "require_audit_log": true
  }
}
```

`allowlist_mode: true` means only hooks explicitly on `allowlisted_hooks` can be installed. All other hooks are blocked, including new public registry hooks until an admin adds them.

When a policy blocks an install, the CLI output is:

```
hookpm install some-hook --registry https://registry.acme.com

BLOCKED by org policy: some-hook is on the organization denylist.
Contact your registry admin (security@acme.com) to request an exception.
```

### 7.7 Air-Gapped Operation

When `HOOKPM_AIR_GAPPED=true`, the registry makes no outbound network calls. Hooks from the public registry must be pre-loaded via the registry admin CLI:

```bash
# On a machine with internet access, export hooks
hookpm registry export bash-danger-guard@1.3.0 > bash-danger-guard-1.3.0.bundle

# Transfer the bundle to the air-gapped environment
scp bash-danger-guard-1.3.0.bundle admin@internal-registry.acme.com:/import/

# On the internal registry, import
hookpm-admin import /import/bash-danger-guard-1.3.0.bundle
```

The `.bundle` format is a signed tarball containing the hook archive, manifest, and public registry signature. The internal registry verifies the public registry signature on import, then re-signs with the internal signing key for distribution to developers.

Mirror sync (for environments with limited internet access rather than full air-gap):
```bash
# Sync a set of approved hooks from the public registry on a schedule
hookpm-admin mirror sync --approved-list /etc/hookpm/approved-hooks.json
```

`approved-hooks.json` is a static file updated by the security team. The mirror job runs daily (or on a configured schedule), downloads new versions of approved hooks, verifies signatures, and makes them available in the internal registry. Developers never contact the public internet.

---

## Appendix A: Complete Event Reference

| Event | When it fires | Can block? | Matcher fields |
|---|---|---|---|
| `PreToolUse` | Before tool executes | Yes (deny/allow) | `tool_name` |
| `PostToolUse` | After tool succeeds | No | `tool_name` |
| `PostToolUseFailure` | After tool errors | No | `tool_name` |
| `PermissionRequest` | Before permission dialog | Yes | `tool_name` |
| `SessionStart` | Session begins | No | `source` |
| `SessionEnd` | Session ends | No | `source` |
| `UserPromptSubmit` | Before Claude processes prompt | Yes | none |
| `Stop` | Claude finishes responding | Yes (prevent stop) | none |
| `SubagentStart` | Subagent spawned | No | `agent_type` |
| `SubagentStop` | Subagent finishes | Yes (prevent stop) | `agent_type` |
| `TeammateIdle` | Teammate about to idle | Yes (force continue) | none |
| `TaskCompleted` | Task marked complete | Yes (block completion) | none |
| `Notification` | Claude sends notification | No | `notification_type` |
| `InstructionsLoaded` | CLAUDE.md loaded | No | none |
| `ConfigChange` | settings.json changes | Yes (except policy) | `source` |
| `WorktreeCreate` | Worktree being created | Yes | none |
| `WorktreeRemove` | Worktree session ends | No | none |
| `PreCompact` | Before context compaction | No | none |

## Appendix B: Capability String Reference

| capability | when to declare |
|---|---|
| `block` | hook can deny tool execution |
| `approve` | hook can auto-approve without user dialog |
| `modify-input` | hook returns `updatedInput` |
| `inject-context` | hook writes plain text to stdout (adds to Claude context) |
| `read-stdin` | hook reads JSON from stdin |
| `write-stdout` | hook writes JSON to stdout |
| `side-effects-only` | hook runs for logging/notification/audit only |
| `override-mcp-output` | hook returns `updatedMCPToolOutput` |
| `prevent-stop` | hook can prevent Claude from stopping |
| `worktree-custom` | hook provides custom worktree directory |

A hook must declare at least one capability. A hook that declares `side-effects-only` must not also declare `block`, `approve`, `modify-input`, or `prevent-stop` — this is flagged as a contradiction by the static analysis job.

## Appendix C: hookpm.lock Format Reference

See §5.2 for the full lockfile schema. Key invariants:
- `settings_index` is always the zero-based array position in the corresponding event array in `settings.json`.
- `integrity` is `sha256-<base64url-encoded-hash>` of the downloaded `.tar.gz` archive.
- `range` defaults to `^<installed_version>` and can be overridden by the user.
- The lockfile is the authoritative record of what hookpm installed. `settings.json` is the operative config. They can diverge if the user edits `settings.json` manually; `hookpm status` detects this and reports it.
