import { readLockfile } from '../settings/index.js'
import { removeHookFromSettings } from '../settings/merge.js'
import { config } from '../config.js'
import { success, error } from './output.js'

export async function runRemove(name: string): Promise<void> {
  const lockfile = readLockfile(config.lockfilePath)

  if (!lockfile.hooks[name]) {
    error(`Hook "${name}" is not installed.`)
    process.exitCode = 1
    return
  }

  const paths = { settingsPath: config.settingsPath, lockfilePath: config.lockfilePath }

  try {
    await removeHookFromSettings(name, paths)
    success(`Removed ${name}`)
  } catch (err) {
    error(`Failed to remove "${name}": ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
  }
}
