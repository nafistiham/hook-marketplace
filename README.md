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
hookpm list              # show installed hooks
hookpm search <query>    # search the registry
hookpm info <name>       # show hook details, capabilities, and security info
hookpm verify <name>     # verify hook signature and integrity
hookpm publish           # publish a hook to the registry
hookpm login             # authenticate with GitHub
hookpm logout            # remove local credentials
```

---

## Example

```sh
# Install a hook that blocks dangerous bash commands
hookpm install bash-danger-guard

# See what's installed
hookpm list

# Remove it
hookpm remove bash-danger-guard
```

---

## The Registry

Hooks live in [`registry/hooks/`](./registry/hooks/). Each hook has a `hook.json` manifest and an implementation file (shell script, TypeScript, Python, etc.).

Browse available hooks or submit your own via pull request.

### Submitting a hook

1. Fork this repo
2. Create `registry/hooks/<your-hook-name>/hook.json` following the [schema](./packages/schema/src/schema.ts)
3. Add your implementation file
4. Open a pull request — CI validates the schema automatically

---

## Project Structure

```
hook-marketplace/
├── packages/
│   ├── cli/        # hookpm CLI — published to npm
│   └── schema/     # hook.json schema (Zod) — shared validation
├── registry/
│   ├── hooks/      # one directory per hook
│   └── index.json  # generated registry index (do not edit manually)
├── api/            # Cloudflare Workers API (Phase 1B — publish endpoint)
└── docs/           # design docs and strategy
```

---

## Contributing

- **New hook:** open a PR adding your hook to `registry/hooks/`
- **Bug in the CLI:** open an issue or PR against `packages/cli/`
- **Design discussion:** check `docs/design/` for current architecture docs

All hooks go through automated schema validation. Security-sensitive hooks get an additional manual review before merge.

---

## License

MIT — see [LICENSE](./LICENSE)
