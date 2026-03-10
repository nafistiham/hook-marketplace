import { readLockfile } from '../settings/index.js'
import { config } from '../config.js'
import { table } from './output.js'

export async function runList(): Promise<void> {
  const lockfile = readLockfile(config.lockfilePath)
  const entries = Object.entries(lockfile.hooks)

  if (entries.length === 0) {
    process.stdout.write('No hooks installed.\n')
    return
  }

  const rows = entries.map(([name, entry]) => ({
    name,
    version: entry.version,
    event: entry.event,
  }))

  table(rows, { columns: ['name', 'version', 'event'] })
}
