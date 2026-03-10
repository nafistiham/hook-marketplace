import { validateHook } from '@hookpm/schema'
import { readLockfile } from '../settings/index.js'
import { fetchHook } from '../registry/client.js'
import { config } from '../config.js'
import { success, warn, error } from './output.js'

export async function runVerify(name?: string): Promise<void> {
  const lockfile = readLockfile(config.lockfilePath)
  const entries = Object.entries(lockfile.hooks)

  // Filter to named hook if provided
  const toVerify = name
    ? entries.filter(([hookName]) => hookName === name)
    : entries

  if (name && toVerify.length === 0) {
    error(`Hook "${name}" is not installed.`)
    process.exitCode = 1
    return
  }

  if (toVerify.length === 0) {
    process.stdout.write('No hooks installed.\n')
    return
  }

  let anyFailed = false

  for (const [hookName, lockEntry] of toVerify) {
    const hookResult = await fetchHook(hookName, lockEntry.version)

    if (!hookResult.ok) {
      warn(`Cannot verify ${hookName}: ${hookResult.error.message}`)
      anyFailed = true
      continue
    }

    const validation = validateHook(hookResult.data)
    if (!validation.success) {
      error(`${hookName}: schema invalid\n${validation.summary}`)
      anyFailed = true
      continue
    }

    success(`${hookName}@${lockEntry.version} — ok`)
  }

  if (anyFailed) {
    process.exitCode = 1
  }
}
