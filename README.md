# hookpm

**The package manager for Claude Code hooks.**

Install, remove, search, and publish hooks from a community registry — the same way you'd use npm for Node.js packages.

```sh
npm install -g hookpm
hookpm install bash-danger-guard
```

---

## What are hooks?

[Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) are shell commands that run automatically at specific points during a Claude Code session — before a tool runs, after it completes, or when the session ends. They let you add safety checks, auto-formatting, logging, and more, without modifying your codebase.

hookpm makes sharing and installing hooks as easy as installing an npm package.

---

## Install

```sh
npm install -g hookpm
```

Requires Node.js 20+.

---

## Commands

```sh
hookpm install <name>    # install a hook into Claude Code settings
hookpm remove <name>     # remove an installed hook
hookpm update <name>     # update a hook to the latest version
hookpm update --all      # update all installed hooks
hookpm list              # show installed hooks
hookpm search <query>    # search the registry
hookpm info <name>       # show hook details, capabilities, and security info
hookpm verify <name>     # verify hook signature and integrity
hookpm publish           # publish a hook to the registry (requires login)
hookpm login             # authenticate with GitHub
hookpm logout            # remove local credentials
```

---

## Example

```sh
# Install a hook that blocks dangerous bash commands
hookpm install bash-danger-guard

# Install a Python security linter
hookpm install python-security-guard

# See what's installed
hookpm list

# Update everything
hookpm update --all

# Remove a hook
hookpm remove bash-danger-guard
```

---

## Registry — 46 hooks

### Security

| Hook | What it does |
|------|-------------|
| `bash-danger-guard` | Blocks dangerous bash commands (rm -rf, dd, mkfs, etc.) |
| `cors-wildcard-guard` | Warns on CORS wildcard (`*`) patterns in source files |
| `dockerfile-secrets-guard` | Blocks secrets baked into Dockerfile ENV/RUN instructions |
| `env-leak-guard` | Blocks writes to .env files containing real secrets |
| `insecure-random-guard` | Warns when insecure RNG is used in security-sensitive contexts |
| `no-eval-guard` | Blocks `eval()`, `exec()`, `new Function()` in JS/TS/Python |
| `open-redirect-guard` | Warns on redirect-from-request-param patterns |
| `prototype-pollution-guard` | Blocks `__proto__` access and warns on related patterns in JS/TS |
| `python-security-guard` | Runs Bandit on Python files, blocks HIGH severity findings |
| `secret-scan-guard` | Detects API keys, tokens, and credentials before writing |
| `semgrep-guard` | Runs Semgrep (auto config) and blocks on ERROR findings |
| `sensitive-file-guard` | Blocks writes to sensitive paths (keys, certs, credentials) |
| `sql-injection-guard` | Detects SQL injection patterns before writing |
| `sql-query-builder-guard` | Blocks raw SQL string concatenation anti-patterns |
| `weak-crypto-guard` | Blocks MD5, SHA-1, DES, RC4 usage in source files |

### Code Quality

| Hook | What it does |
|------|-------------|
| `conflict-marker-guard` | Blocks files containing git conflict markers |
| `console-log-guard` | Warns on `console.log/debug` left in JS/TS files |
| `debug-artifact-guard` | Blocks `debugger`, `pdb.set_trace()`, `binding.pry` artifacts |
| `eslint-on-edit` | Runs ESLint on JS/TS files after every write |
| `hardcoded-url-guard` | Warns on hardcoded localhost/private IP URLs in source files |
| `license-header-guard` | Warns when source files are missing a license header |
| `long-line-guard` | Warns on lines over 120 characters in code files |
| `no-sleep-guard` | Warns on sleep/delay calls; blocks sleeps over 60 seconds |
| `print-statement-guard` | Warns on bare `print()` calls in Python files |
| `typescript-noany-guard` | Warns on explicit `any` usage in TypeScript files |
| `unused-import-guard` | Warns on unused imports in Python files |

### Linting & Validation

| Hook | What it does |
|------|-------------|
| `dockerfile-lint` | Lints Dockerfiles for anti-patterns — no hadolint needed |
| `git-commit-lint` | Enforces conventional commit message format |
| `json-syntax-guard` | Validates JSON syntax before writing |
| `kubernetes-resource-guard` | Blocks privileged containers; warns on missing resource limits |
| `package-version-pin-guard` | Warns on unpinned `^`/`~` versions in package.json |
| `shellcheck-guard` | Runs ShellCheck on shell scripts, blocks on errors |
| `xml-syntax-guard` | Validates XML/SVG syntax before writing |
| `yaml-lint` | Validates YAML syntax before writing |

### Productivity & Automation

| Hook | What it does |
|------|-------------|
| `create-checkpoint` | Git stash checkpoint before risky operations |
| `dependency-audit` | Runs npm/pip audit after package file changes |
| `file-size-guard` | Blocks writes over 500 KB |
| `format-on-write` | Auto-formats code with Prettier or Black after write |
| `large-file-upload-guard` | Warns before uploading large files |
| `no-direct-push-guard` | Blocks git push directly to main/master |
| `port-scan-guard` | Warns when Dockerfile exposes sensitive ports |
| `session-summary` | Writes a session summary when Claude Code ends |
| `test-on-edit` | Runs tests automatically after source file changes |
| `todo-tracker` | Logs TODOs added to code to a tracking file |
| `token-usage-logger` | Tracks token usage per session to a log file |

### Infrastructure & DevOps

| Hook | What it does |
|------|-------------|
| `terraform-security-guard` | Runs tfsec/checkov on Terraform files, blocks on HIGH findings |

---

## Publishing a Hook

Anyone can publish a hook directly — no PR required.

```sh
hookpm login      # authenticate with GitHub (once)
hookpm publish    # run from your hook directory
```

Your hook directory needs a `hook.json` manifest and an implementation file. The manifest is validated against the [schema](./packages/schema/src/schema.ts) on publish — invalid hooks are rejected automatically.

---

## The Registry

The registry is backed by Cloudflare R2 and served via a Cloudflare Workers API at `api.nafistiham.com`. All install, search, and info commands read from the live API. Downloads are tracked and rankings are available at `GET /registry/rankings`.

---

## Project Structure

```
hook-marketplace/
├── packages/
│   ├── cli/        # hookpm CLI — published to npm as hookpm
│   └── schema/     # hook.json schema (Zod) — shared validation
├── registry/
│   ├── hooks/      # canonical hook source (46 and growing)
│   └── index.json  # generated registry index (do not edit manually)
├── api/            # Cloudflare Workers API (publish, auth, rankings, reports)
└── docs/           # design docs and strategy
```

---

## Contributing

- **Publish a hook:** `hookpm login` then `hookpm publish` — no PR needed
- **Bug in the CLI:** open an issue or PR against `packages/cli/`
- **Design discussion:** check `docs/design/` for architecture docs

---

## License

MIT — see [LICENSE](./LICENSE)
