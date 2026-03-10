#!/usr/bin/env node
import { cac } from 'cac'
import { createRequire } from 'node:module'
import { runInstall } from './commands/install.js'
import { runRemove } from './commands/remove.js'
import { runList } from './commands/list.js'
import { runSearch } from './commands/search.js'
import { runInfo } from './commands/info.js'
import { runVerify } from './commands/verify.js'
import { runPublish } from './commands/publish.js'

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

const cli = cac('hookpm')

cli
  .command('install <name>', 'Install a hook from the registry')
  .option('--version <version>', 'Install a specific version')
  .option('--prepend', 'Prepend hook (runs before others in same event)')
  .action(async (name: string, options: { version?: string; prepend?: boolean }) => {
    await runInstall(name, options)
  })

cli
  .command('remove <name>', 'Remove an installed hook')
  .action(async (name: string) => {
    await runRemove(name)
  })

cli
  .command('list', 'List installed hooks')
  .action(async () => {
    await runList()
  })

cli
  .command('search [query]', 'Search the registry')
  .action(async (query?: string) => {
    await runSearch(query)
  })

cli
  .command('info <name>', 'Show hook details')
  .action(async (name: string) => {
    await runInfo(name)
  })

cli
  .command('verify [name]', 'Verify installed hook(s) against schema')
  .action(async (name?: string) => {
    await runVerify(name)
  })

cli
  .command('publish', 'Submit a hook to the registry')
  .action(async () => {
    await runPublish()
  })

cli.help()
cli.version(pkg.version)

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason)
  process.stderr.write(`hookpm: internal error: ${msg}\n`)
  process.exitCode = 1
})

cli.parse()
