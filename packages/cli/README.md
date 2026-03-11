# hookpm

CLI package manager for [Claude Code](https://claude.ai/code) hooks — install, remove, search, and publish hooks from the hookpm registry.

## Install

```sh
npm install -g hookpm
```

## Usage

```sh
hookpm install <hook-name>     # install a hook into Claude Code settings
hookpm remove <hook-name>      # remove a hook
hookpm list                    # list installed hooks
hookpm search <query>          # search the registry
hookpm info <hook-name>        # show hook details
hookpm verify <hook-name>      # verify hook signature and integrity
hookpm publish                 # publish a hook to the registry (requires login)
hookpm login                   # authenticate with GitHub via Clerk
hookpm logout                  # remove local credentials
```

## Registry

The hookpm registry is hosted at [hookpm.dev](https://hookpm.dev). Hooks are open-source and community-maintained.

## License

MIT
